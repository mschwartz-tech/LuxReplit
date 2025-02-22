import { beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import { db } from '../db';
import { users, members, memberProfiles, gymMembershipPricing, schedules } from '../../shared/schema';
import type { User, Member, MemberProfile, GymMembershipPricing, Schedule } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

describe('Member Management System', () => {
  let testAdmin: User;
  let testTrainer: User;
  let testGymLocation: GymMembershipPricing;

  beforeEach(async () => {
    try {
      // Create a test gym location first
      [testGymLocation] = await db.insert(gymMembershipPricing).values({
        gymName: 'Test Gym Location',
        luxeEssentialsPrice: '50.00',
        luxeStrivePrice: '75.00',
        luxeAllAccessPrice: '100.00',
        isactive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Create test admin
      [testAdmin] = await db.insert(users).values({
        username: `test_admin_member_mgmt_${Date.now()}`,
        password: 'password123',
        role: 'admin',
        email: `admin_member_mgmt_${Date.now()}@test.com`,
        name: 'Test Admin Member Management',
        createdAt: new Date()
      }).returning();

      // Create test trainer
      [testTrainer] = await db.insert(users).values({
        username: `test_trainer_member_mgmt_${Date.now()}`,
        password: 'password123',
        role: 'trainer',
        email: `trainer_member_mgmt_${Date.now()}@test.com`,
        name: 'Test Trainer Member Management',
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
      await db.delete(schedules);
      await db.delete(memberProfiles);
      await db.delete(members);
      await db.delete(users).where(eq(users.email, 'member_basic@test.com'));
      await db.delete(users).where(eq(users.email, 'member_full@test.com'));
      await db.delete(users).where(eq(users.email, 'member_unique_1@test.com'));
      await db.delete(users).where(eq(users.email, 'member_unique_2@test.com'));
      await db.delete(users).where(eq(users.username, testAdmin.username));
      await db.delete(users).where(eq(users.username, testTrainer.username));
      await db.delete(gymMembershipPricing);
    } catch (error) {
      console.error('Error in test cleanup:', error);
      throw error;
    }
  });

  describe('Member Creation', () => {
    it('should create a member with basic information', async () => {
      const timestamp = Date.now();
      // Create a test user for the member
      const [testUser] = await db.insert(users).values({
        username: `test_member_basic_${timestamp}`,
        password: 'password123',
        role: 'user',
        email: `member_basic_${timestamp}@test.com`,
        name: 'Test Member Basic',
        createdAt: new Date()
      }).returning();

      // Create a member record
      const [member] = await db.insert(members).values({
        userId: testUser.id,
        membershipType: 'luxe_essentials',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date(),
        assignedTrainerId: testTrainer.id
      }).returning();

      expect(member).toBeDefined();
      expect(member.membershipType).toBe('luxe_essentials');
      expect(member.membershipStatus).toBe('active');
      expect(member.assignedTrainerId).toBe(testTrainer.id);
    });

    it('should create a member with full profile information', async () => {
      const timestamp = Date.now();
      // Create a test user for the member
      const [testUser] = await db.insert(users).values({
        username: `test_member_full_${timestamp}`,
        password: 'password123',
        role: 'user',
        email: `member_full_${timestamp}@test.com`,
        name: 'Test Member Full',
        createdAt: new Date()
      }).returning();

      // Create a member record
      const [member] = await db.insert(members).values({
        userId: testUser.id,
        membershipType: 'luxe_all_access',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date(),
        assignedTrainerId: testTrainer.id
      }).returning();

      // Create a detailed profile
      const [profile] = await db.insert(memberProfiles).values({
        userId: testUser.id,
        birthDate: new Date('1990-01-01'),
        gender: 'female',
        address: '123 Fitness St',
        city: 'Gymtown',
        state: 'CA',
        zipCode: '12345',
        phoneNumber: '555-0123',
        height: '170cm',
        weight: '65kg',
        fitnessGoals: ['weight_loss', 'muscle_gain'],
        healthConditions: ['none'],
        medications: [],
        injuries: [],
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '555-9999',
        emergencyContactRelation: 'Parent',
        preferredContactMethod: 'email',
        marketingOptIn: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      expect(member).toBeDefined();
      expect(profile).toBeDefined();
      expect(profile.userId).toBe(testUser.id);
      expect(profile.fitnessGoals).toContain('weight_loss');
      expect(profile.preferredContactMethod).toBe('email');
    });

    it('should enforce unique constraints on member creation', async () => {
      const timestamp = Date.now();
      const username = `test_member_unique_${timestamp}`;

      // Create initial test user
      await db.insert(users).values({
        username,
        password: 'password123',
        role: 'user',
        email: `member_unique_1_${timestamp}@test.com`,
        name: 'Test Member Unique 1',
        createdAt: new Date()
      });

      // Attempt to create another user with the same username (should fail)
      await expect(
        db.insert(users).values({
          username, // Same username
          password: 'password123',
          role: 'user',
          email: `member_unique_2_${timestamp}@test.com`,
          name: 'Test Member Unique 2',
          createdAt: new Date()
        })
      ).rejects.toThrow('unique constraint');
    });
  });

  describe('Member Profile Management', () => {
    let testMember: Member;
    let testUser: User;

    beforeEach(async () => {
      const timestamp = Date.now();
      // Create a test user and member for profile tests
      [testUser] = await db.insert(users).values({
        username: `test_member_profile_${timestamp}`,
        password: 'password123',
        role: 'user',
        email: `member_profile_${timestamp}@test.com`,
        name: 'Test Member Profile',
        createdAt: new Date()
      }).returning();

      [testMember] = await db.insert(members).values({
        userId: testUser.id,
        membershipType: 'luxe_essentials',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date(),
        assignedTrainerId: testTrainer.id
      }).returning();
    });

    it('should update member profile information', async () => {
      // Create initial profile
      const [profile] = await db.insert(memberProfiles).values({
        userId: testUser.id,
        birthDate: new Date('1990-01-01'),
        gender: 'male',
        height: '180cm',
        weight: '80kg',
        fitnessGoals: ['strength'],
        preferredContactMethod: 'email',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Update profile
      await db.update(memberProfiles)
        .set({
          weight: '78kg',
          fitnessGoals: ['strength', 'endurance'],
          updatedAt: new Date()
        })
        .where(eq(memberProfiles.userId, testUser.id));

      // Fetch updated profile
      const updatedProfile = await db.query.memberProfiles.findFirst({
        where: eq(memberProfiles.userId, testUser.id)
      });

      expect(updatedProfile).toBeDefined();
      expect(updatedProfile?.weight).toBe('78kg');
      expect(updatedProfile?.fitnessGoals).toContain('endurance');
    });

    it('should update member status', async () => {
      // Update member status
      await db.update(members)
        .set({ membershipStatus: sql`'suspended'` })
        .where(eq(members.id, testMember.id));

      // Fetch updated member
      const updatedMember = await db.query.members.findFirst({
        where: eq(members.id, testMember.id)
      });

      expect(updatedMember).toBeDefined();
      expect(updatedMember?.membershipStatus).toBe('suspended');
    });
  });

  describe('Member-Trainer Relationship', () => {
    let testMember: Member;
    let testUser: User;

    beforeEach(async () => {
      // Create test user and member
      [testUser] = await db.insert(users).values({
        username: `test_member_trainer_${Date.now()}`,
        password: 'password123',
        role: 'user',
        email: `member_trainer_${Date.now()}@test.com`,
        name: 'Test Member Trainer',
        createdAt: new Date()
      }).returning();

      [testMember] = await db.insert(members).values({
        userId: testUser.id,
        membershipType: 'luxe_essentials',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date(),
        assignedTrainerId: testTrainer.id
      }).returning();
    });

    it('should assign a trainer to a member', async () => {
      const newTrainer = await db.insert(users).values({
        username: `new_trainer_${Date.now()}`,
        password: 'password123',
        role: 'trainer',
        email: `new_trainer_${Date.now()}@test.com`,
        name: 'New Test Trainer',
        createdAt: new Date()
      }).returning();

      await db.update(members)
        .set({ assignedTrainerId: newTrainer[0].id })
        .where(eq(members.id, testMember.id));

      const updatedMember = await db.query.members.findFirst({
        where: eq(members.id, testMember.id)
      });

      expect(updatedMember).toBeDefined();
      expect(updatedMember?.assignedTrainerId).toBe(newTrainer[0].id);
    });

    it('should schedule training sessions with assigned trainer', async () => {
      const sessionDate = new Date();
      const [schedule] = await db.insert(schedules).values({
        memberId: testMember.id,
        trainerId: testTrainer.id,
        date: sessionDate,
        status: 'scheduled'
      }).returning();

      expect(schedule).toBeDefined();
      expect(schedule.memberId).toBe(testMember.id);
      expect(schedule.trainerId).toBe(testTrainer.id);
      expect(schedule.status).toBe('scheduled');
    });

    it('should validate trainer availability before scheduling', async () => {
      const sessionDate = new Date();
      // Create a conflicting schedule
      await db.insert(schedules).values({
        memberId: testMember.id,
        trainerId: testTrainer.id,
        date: sessionDate,
        status: 'scheduled'
      });

      // Attempt to schedule another session at the same time
      await expect(
        db.insert(schedules).values({
          memberId: testMember.id,
          trainerId: testTrainer.id,
          date: sessionDate,
          status: 'scheduled'
        })
      ).rejects.toThrow();
    });
  });

  describe('Membership Type Transitions', () => {
    let testMember: Member;
    let testUser: User;

    beforeEach(async () => {
      [testUser] = await db.insert(users).values({
        username: `test_member_transition_${Date.now()}`,
        password: 'password123',
        role: 'user',
        email: `member_transition_${Date.now()}@test.com`,
        name: 'Test Member Transition',
        createdAt: new Date()
      }).returning();

      [testMember] = await db.insert(members).values({
        userId: testUser.id,
        membershipType: 'luxe_essentials',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date()
      }).returning();
    });

    it('should upgrade membership type', async () => {
      await db.update(members)
        .set({ membershipType: 'luxe_all_access' })
        .where(eq(members.id, testMember.id));

      const upgradedMember = await db.query.members.findFirst({
        where: eq(members.id, testMember.id)
      });

      expect(upgradedMember).toBeDefined();
      expect(upgradedMember?.membershipType).toBe('luxe_all_access');
    });

    it('should handle membership suspension', async () => {
      await db.update(members)
        .set({ membershipStatus: sql`'suspended'` })
        .where(eq(members.id, testMember.id));

      const suspendedMember = await db.query.members.findFirst({
        where: eq(members.id, testMember.id)
      });

      expect(suspendedMember).toBeDefined();
      expect(suspendedMember?.membershipStatus).toBe('suspended');
    });

    it('should track membership history', async () => {
      // Update membership multiple times
      const updates = [
        { type: sql`'luxe_strive'`, status: sql`'active'` },
        { type: sql`'luxe_all_access'`, status: sql`'active'` },
        { type: sql`'luxe_all_access'`, status: sql`'suspended'` },
        { type: sql`'luxe_all_access'`, status: sql`'active'` }
      ];

      for (const update of updates) {
        await db.update(members)
          .set({
            membershipType: update.type,
            membershipStatus: update.status
          })
          .where(eq(members.id, testMember.id));
      }

      const finalMember = await db.query.members.findFirst({
        where: eq(members.id, testMember.id)
      });

      expect(finalMember).toBeDefined();
      expect(finalMember?.membershipType).toBe('luxe_all_access');
      expect(finalMember?.membershipStatus).toBe('active');
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should validate required fields on member creation', async () => {
      await expect(
        db.insert(members).values({
          // Missing required userId
          membershipType: 'luxe_essentials',
          membershipStatus: 'active',
          gymLocationId: testGymLocation.id,
          startDate: new Date()
        } as any)
      ).rejects.toThrow();
    });

    it('should validate membership type values', async () => {
      const [testUser] = await db.insert(users).values({
        username: `test_member_validation_${Date.now()}`,
        password: 'password123',
        role: 'user',
        email: `member_validation_${Date.now()}@test.com`,
        name: 'Test Member Validation',
        createdAt: new Date()
      }).returning();

      await expect(
        db.insert(members).values({
          userId: testUser.id,
          membershipType: sql`'invalid_type'::text`, // Cast invalid type to text to test DB constraint
          membershipStatus: 'active',
          gymLocationId: testGymLocation.id,
          startDate: new Date()
        })
      ).rejects.toThrow();
    });

    it('should prevent duplicate active memberships for the same user', async () => {
      const [testUser] = await db.insert(users).values({
        username: `test_member_duplicate_${Date.now()}`,
        password: 'password123',
        role: 'user',
        email: `member_duplicate_${Date.now()}@test.com`,
        name: 'Test Member Duplicate',
        createdAt: new Date()
      }).returning();

      // Create first membership
      await db.insert(members).values({
        userId: testUser.id,
        membershipType: 'luxe_essentials',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date()
      });

      // Attempt to create second active membership
      await expect(
        db.insert(members).values({
          userId: testUser.id,
          membershipType: 'luxe_strive',
          membershipStatus: 'active',
          gymLocationId: testGymLocation.id,
          startDate: new Date()
        })
      ).rejects.toThrow();
    });
  });
});