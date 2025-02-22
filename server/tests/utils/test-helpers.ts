import { db } from '../../db';
import { 
  users, members, gymMembershipPricing, memberAssessments,
  memberProgressPhotos, workoutPlans, workoutLogs,
  memberProfiles, strengthMetrics, progress,
  classWaitlist, classRegistrations, classes,
  payments
} from '../../../shared/schema';
import type { User, Member, GymMembershipPricing } from '../../../shared/schema';
import { eq, like } from 'drizzle-orm';

interface CreateTestUserOptions {
  role?: 'admin' | 'trainer' | 'user';
  prefix?: string;
}

export async function createTestUser(options: CreateTestUserOptions = {}): Promise<User> {
  const { role = 'user', prefix = 'test' } = options;
  const timestamp = Date.now();

  const [user] = await db.insert(users).values({
    username: `${prefix}_${role}_${timestamp}`,
    password: 'password123',
    role: role,
    email: `${prefix}_${role}_${timestamp}@test.com`,
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    createdAt: new Date()
  }).returning();

  return user;
}

export async function createTestGymLocation(): Promise<GymMembershipPricing> {
  const [gymLocation] = await db.insert(gymMembershipPricing).values({
    gymName: `Test Gym ${Date.now()}`,
    luxeEssentialsPrice: '50.00',
    luxeStrivePrice: '75.00',
    luxeAllAccessPrice: '100.00',
    isactive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  return gymLocation;
}

export async function createTestMember(
  user: User,
  gymLocation: GymMembershipPricing,
  trainer?: User
): Promise<Member> {
  const [member] = await db.insert(members).values({
    userId: user.id,
    membershipType: 'luxe_essentials',
    membershipStatus: 'active',
    gymLocationId: gymLocation.id,
    startDate: new Date(),
    assignedTrainerId: trainer?.id
  }).returning();

  return member;
}

// Updated cleanupTestData function with proper ordering and error handling
export async function cleanupTestData() {
  try {
    // Start a transaction for atomic cleanup
    await db.transaction(async (tx) => {
      // Delete in correct order based on dependencies
      // 1. Delete dependent records first
      await tx.delete(payments);  // Add payments cleanup
      await tx.delete(strengthMetrics);
      await tx.delete(progress);
      await tx.delete(memberProgressPhotos);
      await tx.delete(memberAssessments);
      await tx.delete(workoutLogs);
      await tx.delete(workoutPlans);
      await tx.delete(memberProfiles);
      await tx.delete(classWaitlist);
      await tx.delete(classRegistrations);
      await tx.delete(classes);

      // 2. Delete main records
      await tx.delete(members);
      await tx.delete(users).where(like(users.username, '%_test_%'));
      await tx.delete(gymMembershipPricing).where(like(gymMembershipPricing.gymName, 'Test Gym%'));
    });
  } catch (error) {
    console.error('Error in cleanupTestData:', error);
    // Re-throw the error to ensure test failure
    throw new Error(`Failed to clean up test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}