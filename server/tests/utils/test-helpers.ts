import { db } from '../../db';
import { 
  users, members, gymMembershipPricing, memberAssessments,
  memberProgressPhotos, workoutPlans, workoutLogs,
  memberProfiles, strengthMetrics, progress,
  classWaitlist, classRegistrations, classes,
  payments
} from '../../../shared/schema';
import { eq, like } from 'drizzle-orm';

// Define types using Drizzle's type inference
type UserType = typeof users.$inferSelect;
type MemberType = typeof members.$inferSelect;
type GymLocationType = typeof gymMembershipPricing.$inferSelect;

interface CreateTestUserOptions {
  role?: 'admin' | 'trainer' | 'user';
  prefix?: string;
}

export async function createTestUser(options: CreateTestUserOptions = {}): Promise<UserType> {
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

export async function createTestGymLocation(): Promise<GymLocationType> {
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
  user: UserType,
  gymLocation: GymLocationType,
  trainer?: UserType
): Promise<MemberType> {
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

export async function cleanupTestData() {
  try {
    await db.transaction(async (tx) => {
      // Delete in correct order based on dependencies
      await tx.delete(payments);
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

      // Delete main records
      await tx.delete(members);
      await tx.delete(users).where(like(users.username, '%_test_%'));
      await tx.delete(gymMembershipPricing).where(like(gymMembershipPricing.gymName, 'Test Gym%'));
    });
  } catch (error) {
    console.error('Error in cleanupTestData:', error);
    throw new Error(`Failed to clean up test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}