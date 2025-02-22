import { db } from '../db';
import { users, classTemplates, classes, classWaitlist } from '../../shared/schema';
import type { User, ClassTemplate, Class, ClassWaitlist } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import '@jest/globals';

describe('Class Scheduling System', () => {
  let testTrainer: User;
  let testTemplate: ClassTemplate;

  beforeEach(async () => {
    // Create a test trainer
    [testTrainer] = await db.insert(users).values({
      username: 'test_trainer',
      password: 'password123',
      role: 'trainer',
      email: 'trainer@test.com',
      name: 'Test Trainer'
    }).returning();

    // Create a test class template
    [testTemplate] = await db.insert(classTemplates).values({
      trainerId: testTrainer.id,
      name: 'Test Class',
      description: 'Test class description',
      duration: 60,
      capacity: 10,
      dayOfWeek: 1, // Monday
      startTime: '10:00',
      isActive: true
    }).returning();
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(classWaitlist);
    await db.delete(classes);
    await db.delete(classTemplates);
    await db.delete(users);
  });

  describe('Class Template Management', () => {
    it('should create a class template successfully', async () => {
      const template = await db.query.classTemplates.findFirst({
        where: eq(classTemplates.id, testTemplate.id)
      });

      expect(template).toBeDefined();
      expect(template?.name).toBe('Test Class');
      expect(template?.trainerId).toBe(testTrainer.id);
    });

    it('should enforce valid time format for startTime', async () => {
      await expect(db.insert(classTemplates).values({
        trainerId: testTrainer.id,
        name: 'Invalid Time Class',
        description: 'Test class description',
        duration: 60,
        capacity: 10,
        dayOfWeek: 1,
        startTime: 'invalid_time',
        isActive: true
      })).rejects.toThrow();
    });

    it('should update class template details', async () => {
      const updatedCapacity = 15;
      await db.update(classTemplates)
        .set({ capacity: updatedCapacity })
        .where(eq(classTemplates.id, testTemplate.id));

      const template = await db.query.classTemplates.findFirst({
        where: eq(classTemplates.id, testTemplate.id)
      });

      expect(template?.capacity).toBe(updatedCapacity);
    });
  });

  describe('Class Creation from Template', () => {
    it('should create a class instance from template', async () => {
      const [newClass] = await db.insert(classes).values({
        trainerId: testTemplate.trainerId,
        name: testTemplate.name,
        description: testTemplate.description,
        date: new Date('2025-03-01'),
        time: testTemplate.startTime,
        duration: testTemplate.duration,
        capacity: testTemplate.capacity,
        status: 'scheduled',
        templateId: testTemplate.id,
        currentCapacity: 0,
        waitlistEnabled: true,
        waitlistCapacity: 5
      }).returning();

      expect(newClass).toBeDefined();
      expect(newClass.templateId).toBe(testTemplate.id);
      expect(newClass.capacity).toBe(testTemplate.capacity);
    });

    it('should maintain template relationship when updating class', async () => {
      const [newClass] = await db.insert(classes).values({
        trainerId: testTemplate.trainerId,
        name: testTemplate.name,
        description: testTemplate.description,
        date: new Date('2025-03-01'),
        time: testTemplate.startTime,
        duration: testTemplate.duration,
        capacity: testTemplate.capacity,
        status: 'scheduled',
        templateId: testTemplate.id,
        currentCapacity: 0,
        waitlistEnabled: true,
        waitlistCapacity: 5
      }).returning();

      await db.update(classes)
        .set({ capacity: 20 })
        .where(eq(classes.id, newClass.id));

      const updatedClass = await db.query.classes.findFirst({
        where: eq(classes.id, newClass.id)
      });

      expect(updatedClass?.templateId).toBe(testTemplate.id);
    });
  });

  describe('Waitlist Management', () => {
    let testClass: Class;
    let testMember: User;

    beforeEach(async () => {
      // Create a test class
      [testClass] = await db.insert(classes).values({
        trainerId: testTemplate.trainerId,
        name: testTemplate.name,
        description: testTemplate.description,
        date: new Date('2025-03-01'),
        time: testTemplate.startTime,
        duration: testTemplate.duration,
        capacity: 1, // Small capacity to test waitlist
        status: 'scheduled',
        templateId: testTemplate.id,
        currentCapacity: 1, // Class is full
        waitlistEnabled: true,
        waitlistCapacity: 5
      }).returning();

      // Create a test member
      [testMember] = await db.insert(users).values({
        username: 'test_member',
        password: 'password123',
        role: 'user',
        email: 'member@test.com',
        name: 'Test Member'
      }).returning();
    });

    it('should add member to waitlist when class is full', async () => {
      const [waitlistEntry] = await db.insert(classWaitlist).values({
        classId: testClass.id,
        memberId: testMember.id,
        position: 1,
        status: 'waiting'
      }).returning();

      expect(waitlistEntry).toBeDefined();
      expect(waitlistEntry.status).toBe('waiting');
      expect(waitlistEntry.position).toBe(1);
    });

    it('should maintain waitlist position order', async () => {
      // Create another test member
      const [testMember2] = await db.insert(users).values({
        username: 'test_member2',
        password: 'password123',
        role: 'user',
        email: 'member2@test.com',
        name: 'Test Member 2'
      }).returning();

      // Add both members to waitlist
      await db.insert(classWaitlist).values([
        {
          classId: testClass.id,
          memberId: testMember.id,
          position: 1,
          status: 'waiting'
        },
        {
          classId: testClass.id,
          memberId: testMember2.id,
          position: 2,
          status: 'waiting'
        }
      ]);

      const waitlist = await db.query.classWaitlist.findMany({
        where: eq(classWaitlist.classId, testClass.id),
        orderBy: classWaitlist.position
      });

      expect(waitlist).toHaveLength(2);
      expect(waitlist[0].position).toBe(1);
      expect(waitlist[1].position).toBe(2);
    });

    it('should enforce waitlist capacity limits', async () => {
      // Fill up waitlist to capacity
      const waitlistEntries = Array.from({ length: testClass.waitlistCapacity }, (_, i) => ({
        classId: testClass.id,
        memberId: testMember.id,
        position: i + 1,
        status: 'waiting'
      }));

      await db.insert(classWaitlist).values(waitlistEntries);

      // Attempt to add one more entry
      await expect(db.insert(classWaitlist).values({
        classId: testClass.id,
        memberId: testMember.id,
        position: testClass.waitlistCapacity + 1,
        status: 'waiting'
      })).rejects.toThrow();
    });
  });
});