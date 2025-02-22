import { beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import { db } from '../db';
import { users, members, progress, strengthMetrics, exercises, muscleGroups, gymMembershipPricing } from '../../shared/schema';
import type { User, Member, Progress, Exercise, MuscleGroup, GymMembershipPricing } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Progress Tracking System', () => {
  let testUser: User;
  let testMember: Member;
  let testExercise: Exercise;
  let testMuscleGroup: MuscleGroup;
  let testGymLocation: GymMembershipPricing;

  beforeEach(async () => {
    try {
      // Create test gym location
      [testGymLocation] = await db.insert(gymMembershipPricing).values({
        gymName: `Test Gym Progress ${Date.now()}`,
        luxeEssentialsPrice: '50.00',
        luxeStrivePrice: '75.00',
        luxeAllAccessPrice: '100.00',
        isactive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Create test user
      [testUser] = await db.insert(users).values({
        username: `test_user_progress_${Date.now()}`,
        password: 'password123',
        role: 'user',
        email: `progress_test_${Date.now()}@test.com`,
        name: 'Test Progress User',
        createdAt: new Date()
      }).returning();

      // Create test member
      [testMember] = await db.insert(members).values({
        userId: testUser.id,
        membershipType: 'luxe_essentials',
        membershipStatus: 'active',
        gymLocationId: testGymLocation.id,
        startDate: new Date()
      }).returning();

      // Create test muscle group
      [testMuscleGroup] = await db.insert(muscleGroups).values({
        name: `Test Muscle Group ${Date.now()}`,
        description: 'Test muscle group description',
        bodyRegion: 'upper'
      }).returning();

      // Create test exercise
      [testExercise] = await db.insert(exercises).values({
        name: `Test Exercise ${Date.now()}`,
        description: 'Test exercise description',
        difficulty: 'intermediate',
        primaryMuscleGroupId: testMuscleGroup.id,
        secondaryMuscleGroupIds: [],
        instructions: ['Step 1', 'Step 2'],
        tips: ['Tip 1'],
        equipment: ['Dumbbell'],
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
      await db.delete(strengthMetrics);
      await db.delete(progress);
      await db.delete(members);
      await db.delete(users);
      await db.delete(exercises);
      await db.delete(muscleGroups);
      await db.delete(gymMembershipPricing);
    } catch (error) {
      console.error('Error in test cleanup:', error);
      throw error;
    }
  });

  describe('Progress Records', () => {
    it('should create a progress record with measurements', async () => {
      const [progressRecord] = await db.insert(progress).values({
        memberId: testMember.id,
        weight: '75.5',
        bodyFatPercentage: '20.5',
        measurements: {
          chest: 100,
          waist: 80,
          hips: 95
        },
        notes: 'Initial progress record'
      }).returning();

      expect(progressRecord).toBeDefined();
      expect(progressRecord.memberId).toBe(testMember.id);
      expect(progressRecord.measurements).toEqual({
        chest: 100,
        waist: 80,
        hips: 95
      });
    });

    it('should update progress measurements', async () => {
      // Create initial progress record
      const [progressRecord] = await db.insert(progress).values({
        memberId: testMember.id,
        weight: '75.5',
        measurements: {
          chest: 100,
          waist: 80,
          hips: 95
        }
      }).returning();

      // Update measurements
      await db.update(progress)
        .set({
          measurements: {
            chest: 98,
            waist: 78,
            hips: 94
          },
          updatedAt: new Date()
        })
        .where(eq(progress.id, progressRecord.id));

      // Fetch updated record
      const updatedProgress = await db.query.progress.findFirst({
        where: eq(progress.id, progressRecord.id)
      });

      expect(updatedProgress).toBeDefined();
      expect(updatedProgress?.measurements).toEqual({
        chest: 98,
        waist: 78,
        hips: 94
      });
    });
  });

  describe('Strength Metrics', () => {
    let progressRecord: Progress;

    beforeEach(async () => {
      [progressRecord] = await db.insert(progress).values({
        memberId: testMember.id,
        weight: '75.5',
        measurements: {}
      }).returning();
    });

    it('should record strength metrics for an exercise', async () => {
      const [strengthMetric] = await db.insert(strengthMetrics).values({
        progressId: progressRecord.id,
        exerciseId: testExercise.id,
        weightAmount: '50',
        numberOfSets: 3,
        numberOfReps: 12,
        exerciseNotes: 'Good form maintained'
      }).returning();

      expect(strengthMetric).toBeDefined();
      expect(strengthMetric.weightAmount).toBe('50');
      expect(strengthMetric.numberOfSets).toBe(3);
      expect(strengthMetric.numberOfReps).toBe(12);
    });

    it('should update strength metrics', async () => {
      const [strengthMetric] = await db.insert(strengthMetrics).values({
        progressId: progressRecord.id,
        exerciseId: testExercise.id,
        weightAmount: '50',
        numberOfSets: 3,
        numberOfReps: 12
      }).returning();

      await db.update(strengthMetrics)
        .set({
          weightAmount: '55',
          numberOfReps: 10
        })
        .where(eq(strengthMetrics.id, strengthMetric.id));

      const updatedMetric = await db.query.strengthMetrics.findFirst({
        where: eq(strengthMetrics.id, strengthMetric.id)
      });

      expect(updatedMetric).toBeDefined();
      expect(updatedMetric?.weightAmount).toBe('55');
      expect(updatedMetric?.numberOfReps).toBe(10);
    });
  });

  describe('Cascade Behavior', () => {
    it('should cascade delete progress and strength metrics when member is deleted', async () => {
      // Create progress record
      const [progressRecord] = await db.insert(progress).values({
        memberId: testMember.id,
        weight: '75.5',
        measurements: {}
      }).returning();

      // Create strength metric
      await db.insert(strengthMetrics).values({
        progressId: progressRecord.id,
        exerciseId: testExercise.id,
        weightAmount: '50',
        numberOfSets: 3,
        numberOfReps: 12
      });

      // Delete member
      await db.delete(members).where(eq(members.id, testMember.id));

      // Verify cascade deletion
      const deletedProgress = await db.query.progress.findFirst({
        where: eq(progress.memberId, testMember.id)
      });

      const deletedMetrics = await db.query.strengthMetrics.findFirst({
        where: eq(strengthMetrics.progressId, progressRecord.id)
      });

      expect(deletedProgress).toBeUndefined();
      expect(deletedMetrics).toBeUndefined();
    });

    it('should not delete strength metrics when exercise is referenced', async () => {
      // Create progress record
      const [progressRecord] = await db.insert(progress).values({
        memberId: testMember.id,
        weight: '75.5',
        measurements: {}
      }).returning();

      // Create strength metric
      const [strengthMetric] = await db.insert(strengthMetrics).values({
        progressId: progressRecord.id,
        exerciseId: testExercise.id,
        weightAmount: '50',
        numberOfSets: 3,
        numberOfReps: 12
      }).returning();

      // Attempt to delete exercise (should fail due to foreign key constraint)
      await expect(
        db.delete(exercises).where(eq(exercises.id, testExercise.id))
      ).rejects.toThrow();

      // Verify strength metric still exists
      const existingMetric = await db.query.strengthMetrics.findFirst({
        where: eq(strengthMetrics.id, strengthMetric.id)
      });

      expect(existingMetric).toBeDefined();
    });
  });
});