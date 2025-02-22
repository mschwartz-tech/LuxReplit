import { beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import { db } from '../db';
import { users, classTemplates, classes, classWaitlist, members, gymMembershipPricing } from '../../shared/schema';
import type { User, ClassTemplate, Class, Member, GymMembershipPricing } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { PostgresError } from '@neondatabase/serverless';

// Define the valid status types
type WaitlistStatus = 'waiting' | 'notified' | 'expired';

describe('Class Scheduling System', () => {
  let testTrainer: User;
  let testTemplate: ClassTemplate;
  let testGymLocation: GymMembershipPricing;

  beforeEach(async () => {
    try {
      // Create a test gym location first
      [testGymLocation] = await db.insert(gymMembershipPricing).values({
        gymName: 'Test Gym',
        luxeEssentialsPrice: '50.00',
        luxeStrivePrice: '75.00',
        luxeAllAccessPrice: '100.00',
        isactive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Create a test trainer
      [testTrainer] = await db.insert(users).values({
        username: 'test_trainer',
        password: 'password123',
        role: 'trainer',
        email: 'trainer@test.com',
        name: 'Test Trainer',
        createdAt: new Date()
      }).returning();

      // Create a test class template
      [testTemplate] = await db.insert(classTemplates).values({
        trainerId: testTrainer.id,
        name: 'Test Class',
        description: 'Test class description',
        duration: 60,
        capacity: 10,
        dayOfWeek: 1,
        startTime: '10:00',
        isActive: true,
        createdAt: new Date()
      }).returning();
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      // Clean up test data in correct order
      await db.delete(classWaitlist);
      await db.delete(classes);
      await db.delete(classTemplates);
      await db.delete(members);
      await db.delete(users);
      await db.delete(gymMembershipPricing);
    } catch (error) {
      console.error('Error in test cleanup:', error);
      throw error;
    }
  });

  describe('Class Template Management', () => {
    it('should create a class template successfully', async () => {
      const template = await db.query.classTemplates.findFirst({
        where: eq(classTemplates.id, testTemplate.id)
      });

      expect(template).toBeDefined();
      expect(template?.name).toBe('Test Class');
      expect(template?.trainerId).toBe(testTrainer.id);
    }, 10000);

    it('should enforce valid time format for startTime', async () => {
      try {
        await db.insert(classTemplates).values({
          trainerId: testTrainer.id,
          name: 'Invalid Time Class',
          description: 'Test class description',
          duration: 60,
          capacity: 10,
          dayOfWeek: 1,
          startTime: '25:00', // Invalid hour
          isActive: true,
          createdAt: new Date()
        });
        fail('Should have thrown an error for invalid time format');
      } catch (error) {
        // Type guard to check if error is PostgresError
        if (error instanceof Error) {
          expect(error.message).toMatch(/class_templates_time_format_check/);
        } else {
          fail('Expected PostgresError but received different error type');
        }
      }
    }, 10000);

    it('should update class template details', async () => {
      const updatedCapacity = 15;
      await db.update(classTemplates)
        .set({ capacity: updatedCapacity })
        .where(eq(classTemplates.id, testTemplate.id));

      const template = await db.query.classTemplates.findFirst({
        where: eq(classTemplates.id, testTemplate.id)
      });

      expect(template?.capacity).toBe(updatedCapacity);
    }, 10000);
  });

  describe('Waitlist Management', () => {
    let testClass: Class;

    beforeEach(async () => {
      try {
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
          waitlistCapacity: 5,
          createdAt: new Date()
        }).returning();
      } catch (error) {
        console.error('Error creating test class:', error);
        throw error;
      }
    });

    it('should add member to waitlist when class is full', async () => {
      // Create a test member
      const [testMember] = await db.insert(users).values({
        username: 'test_member',
        password: 'password123',
        role: 'user',
        email: 'member@test.com',
        name: 'Test Member',
        createdAt: new Date()
      }).returning();

      const [memberRecord] = await db.insert(members).values({
        userId: testMember.id,
        membershipType: 'luxe_essentials',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date()
      }).returning();

      const [waitlistEntry] = await db.insert(classWaitlist).values({
        classId: testClass.id,
        memberId: memberRecord.id,
        position: 1,
        status: 'waiting' as WaitlistStatus
      }).returning();

      expect(waitlistEntry).toBeDefined();
      expect(waitlistEntry.status).toBe('waiting');
      expect(waitlistEntry.position).toBe(1);
    }, 10000);

    it('should maintain waitlist position order', async () => {
      // Create first test member
      const [testMember1] = await db.insert(users).values({
        username: 'test_member1',
        password: 'password123',
        role: 'user',
        email: 'member1@test.com',
        name: 'Test Member 1',
        createdAt: new Date()
      }).returning();

      const [memberRecord1] = await db.insert(members).values({
        userId: testMember1.id,
        membershipType: 'luxe_essentials',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date()
      }).returning();

      // Create second test member
      const [testMember2] = await db.insert(users).values({
        username: 'test_member2',
        password: 'password123',
        role: 'user',
        email: 'member2@test.com',
        name: 'Test Member 2',
        createdAt: new Date()
      }).returning();

      const [memberRecord2] = await db.insert(members).values({
        userId: testMember2.id,
        membershipType: 'luxe_essentials',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date()
      }).returning();

      // Add both members to waitlist
      await db.insert(classWaitlist).values([
        {
          classId: testClass.id,
          memberId: memberRecord1.id,
          position: 1,
          status: 'waiting' as WaitlistStatus
        },
        {
          classId: testClass.id,
          memberId: memberRecord2.id,
          position: 2,
          status: 'waiting' as WaitlistStatus
        }
      ]);

      const waitlist = await db.query.classWaitlist.findMany({
        where: eq(classWaitlist.classId, testClass.id),
        orderBy: classWaitlist.position
      });

      expect(waitlist).toHaveLength(2);
      expect(waitlist[0].position).toBe(1);
      expect(waitlist[1].position).toBe(2);
    }, 10000);

    it('should enforce waitlist capacity limits', async () => {
      type TestMember = { user: User; member: Member };
      const testMembers: TestMember[] = [];

      // Create unique members for each waitlist position plus one extra
      for (let i = 0; i < testClass.waitlistCapacity + 1; i++) {
        const [user] = await db.insert(users).values({
          username: `test_member${i}`,
          password: 'password123',
          role: 'user',
          email: `member${i}@test.com`,
          name: `Test Member ${i}`,
          createdAt: new Date()
        }).returning();

        const [member] = await db.insert(members).values({
          userId: user.id,
          membershipType: 'luxe_essentials',
          membershipStatus: 'active',
          gymLocationId: testGymLocation.id,
          startDate: new Date()
        }).returning();

        testMembers.push({ user, member });
      }

      // Fill up waitlist to capacity
      await db.insert(classWaitlist).values(
        testMembers.slice(0, testClass.waitlistCapacity).map((testMember, index) => ({
          classId: testClass.id,
          memberId: testMember.member.id,
          position: index + 1,
          status: 'waiting' as WaitlistStatus
        }))
      );

      // Attempt to add one more entry beyond capacity
      try {
        await db.insert(classWaitlist).values({
          classId: testClass.id,
          memberId: testMembers[testClass.waitlistCapacity].member.id,
          position: testClass.waitlistCapacity + 1,
          status: 'waiting' as WaitlistStatus
        });
        fail('Should have thrown an error for exceeding waitlist capacity');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toMatch(/waitlist_capacity_check/);
        } else {
          fail('Expected PostgresError but received different error type');
        }
      }
    }, 10000);
  });
});