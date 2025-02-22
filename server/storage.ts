import {
  User,
  InsertUser,
  Member,
  InsertMember,
  WorkoutPlan,
  InsertWorkoutPlan,
  WorkoutLog,
  InsertWorkoutLog,
  Schedule,
  InsertSchedule,
  Invoice,
  InsertInvoice,
  MarketingCampaign,
  InsertMarketingCampaign,
  MemberProfile,
  InsertMemberProfile,
  MemberAssessment,
  InsertMemberAssessment,
  MemberProgressPhoto,
  InsertMemberProgressPhoto,
  PricingPlan,
  InsertPricingPlan,
  MembershipPricing,
  InsertMembershipPricing,
  Progress,
  InsertProgress,
  StrengthMetric,
  InsertStrengthMetric,
  MealPlan,
  InsertMealPlan,
  MemberMealPlan,
  InsertMemberMealPlan,
  MuscleGroup,
  InsertMuscleGroup,
  Exercise,
  InsertExercise,
  MovementPattern,
  InsertMovementPattern,
  TrainingPackage,
  InsertTrainingPackage,
  TrainingClient,
  InsertTrainingClient,
} from "@shared/schema";
import session from "express-session";
import {
  users,
  members,
  workoutPlans,
  workoutLogs,
  schedules,
  invoices,
  marketingCampaigns,
  exercises,
  muscleGroups,
  memberProfiles,
  memberAssessments,
  memberProgressPhotos,
  pricingPlans,
  membershipPricing,
  progress,
  strengthMetrics,
  movementPatterns,
  trainingPackages,
  trainingClients,
  mealPlans,
  memberMealPlans,
} from "@shared/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { db } from "./db";

//Added error handling
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Member operations
  getMembers(): Promise<Member[]>;
  getMembersByTrainer(trainerId: number): Promise<Member[]>;
  getMember(id: number): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;

  // Member profile operations
  getMemberProfile(memberId: number): Promise<MemberProfile | undefined>;
  createMemberProfile(profile: InsertMemberProfile): Promise<MemberProfile>;
  updateMemberProfile(
    memberId: number,
    profile: Partial<InsertMemberProfile>
  ): Promise<MemberProfile>;

  // Member assessment operations
  getMemberAssessments(memberId: number): Promise<MemberAssessment[]>;
  getMemberAssessment(id: number): Promise<MemberAssessment | undefined>;
  createMemberAssessment(
    assessment: InsertMemberAssessment
  ): Promise<MemberAssessment>;

  // Member progress photo operations
  getMemberProgressPhotos(memberId: number): Promise<MemberProgressPhoto[]>;
  getMemberProgressPhoto(id: number): Promise<MemberProgressPhoto | undefined>;
  createMemberProgressPhoto(
    photo: InsertMemberProgressPhoto
  ): Promise<MemberProgressPhoto>;

  // Workout plan operations
  getWorkoutPlans(): Promise<WorkoutPlan[]>;
  getWorkoutPlansByMember(memberId: number): Promise<WorkoutPlan[]>;
  getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined>;
  createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan>;
  updateWorkoutPlanCompletionRate(
    id: number,
    completionRate: number
  ): Promise<WorkoutPlan>;

  // Workout log operations
  getWorkoutLogs(workoutPlanId: number): Promise<WorkoutLog[]>;
  getMemberWorkoutLogs(memberId: number): Promise<WorkoutLog[]>;
  createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog>;

  // Schedule operations
  getSchedules(): Promise<Schedule[]>;
  getSchedule(id: number): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;

  // Invoice operations
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;

  // Marketing campaign operations
  getMarketingCampaigns(): Promise<MarketingCampaign[]>;
  getMarketingCampaign(id: number): Promise<MarketingCampaign | undefined>;
  createMarketingCampaign(
    campaign: InsertMarketingCampaign
  ): Promise<MarketingCampaign>;

  // Exercise Library operations
  getMuscleGroups(): Promise<MuscleGroup[]>;
  getMuscleGroup(id: number): Promise<MuscleGroup | undefined>;
  createMuscleGroup(group: InsertMuscleGroup): Promise<MuscleGroup>;

  getExercises(): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  getExercisesByMuscleGroup(muscleGroupId: number): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;

  // Pricing plan operations
  getPricingPlans(): Promise<PricingPlan[]>;
  getPricingPlan(id: number): Promise<PricingPlan | undefined>;
  createPricingPlan(plan: InsertPricingPlan): Promise<PricingPlan>;
  updatePricingPlan(
    id: number,
    plan: Partial<InsertPricingPlan>
  ): Promise<PricingPlan>;

  // Membership Pricing operations
  getMembershipPricing(): Promise<MembershipPricing[]>;
  getMembershipPricingById(id: number): Promise<MembershipPricing | undefined>;
  createMembershipPricing(
    pricing: InsertMembershipPricing
  ): Promise<MembershipPricing>;
  updateMembershipPricing(
    id: number,
    pricing: Partial<InsertMembershipPricing>
  ): Promise<MembershipPricing>;
  deleteMembershipPricing(id: number): Promise<void>;
  getAllMembershipPricing(): Promise<MembershipPricing[]>;

  //Meal Plan operations
  getMealPlans(): Promise<MealPlan[]>;
  getMealPlan(id: number): Promise<MealPlan | null>;
  createMealPlan(data: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(
    id: number,
    data: Partial<InsertMealPlan>
  ): Promise<MealPlan>;
  deleteMealPlan(id: number): Promise<void>;

  // Member Meal Plan operations
  getMemberMealPlans(memberId: number): Promise<MemberMealPlan[]>;
  getMemberMealPlan(id: number): Promise<MemberMealPlan | null>;
  createMemberMealPlan(
    data: InsertMemberMealPlan
  ): Promise<MemberMealPlan>;
  updateMemberMealPlan(
    id: number,
    data: Partial<InsertMemberMealPlan>
  ): Promise<MemberMealPlan>;
  deleteMemberMealPlan(id: number): Promise<void>;

  // Progress tracking methods
  getMemberProgress(memberId: number): Promise<Progress[]>;
  getProgress(id: number): Promise<Progress | undefined>;
  createProgress(progress: InsertProgress): Promise<Progress>;
  updateProgress(
    id: number,
    progress: Partial<InsertProgress>
  ): Promise<Progress>;

  // Strength metrics methods
  getMemberStrengthMetrics(memberId: number): Promise<StrengthMetric[]>;
  getProgressStrengthMetrics(
    progressId: number
  ): Promise<StrengthMetric[]>;
  createStrengthMetric(
    metric: InsertStrengthMetric
  ): Promise<StrengthMetric>;

  // Movement Pattern methods
  getMovementPatterns(): Promise<MovementPattern[]>;
  getMovementPattern(id: number): Promise<MovementPattern | undefined>;
  createMovementPattern(
    pattern: InsertMovementPattern
  ): Promise<MovementPattern>;

  // Training Package methods
  getTrainingPackages(): Promise<TrainingPackage[]>;
  getTrainingPackage(id: number): Promise<TrainingPackage | undefined>;
  createTrainingPackage(
    pkg: InsertTrainingPackage
  ): Promise<TrainingPackage>;
  updateTrainingPackage(
    id: number,
    pkg: Partial<InsertTrainingPackage>
  ): Promise<TrainingPackage>;

  // Training Client methods
  getTrainingClients(): Promise<TrainingClient[]>;
  getTrainingClientsByTrainer(
    trainerId: number
  ): Promise<TrainingClient[]>;
  getTrainingClient(id: number): Promise<TrainingClient | undefined>;
  createTrainingClient(
    client: InsertTrainingClient
  ): Promise<TrainingClient>;
  updateTrainingClientStatus(
    id: number,
    status: string
  ): Promise<TrainingClient>;
  updateTrainingClientSessions(
    id: number,
    sessionsRemaining: number
  ): Promise<TrainingClient>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db
        .insert(users)
        .values(user)
        .returning();
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error; // Re-throw for handling at a higher level
    }
  }

  async getMembers(): Promise<Member[]> {
    try {
      return await db.select().from(members);
    } catch (error) {
      console.error("Error getting members:", error);
      return [];
    }
  }

  async getMembersByTrainer(trainerId: number): Promise<Member[]> {
    try {
      return await db
        .select()
        .from(members)
        .where(eq(members.assignedTrainerId, trainerId));
    } catch (error) {
      console.error("Error getting members by trainer:", error);
      return [];
    }
  }

  async getMember(id: number): Promise<Member | undefined> {
    try {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.id, id));
      return member;
    } catch (error) {
      console.error("Error getting member:", error);
      return undefined;
    }
  }

  async createMember(member: InsertMember): Promise<Member> {
    try {
      const [newMember] = await db
        .insert(members)
        .values(member)
        .returning();
      return newMember;
    } catch (error) {
      console.error("Error creating member:", error);
      throw error;
    }
  }

  async getMemberProfile(
    memberId: number
  ): Promise<MemberProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.userId, memberId));
      return profile;
    } catch (error) {
      console.error("Error getting member profile:", error);
      return undefined;
    }
  }

  async createMemberProfile(
    profile: InsertMemberProfile
  ): Promise<MemberProfile> {
    try {
      const [newProfile] = await db
        .insert(memberProfiles)
        .values({
          ...profile,
          height: profile.height?.toString(),
          weight: profile.weight?.toString(),
          updatedAt: new Date(),
        })
        .returning();
      return newProfile;
    } catch (error) {
      console.error("Error creating member profile:", error);
      throw error;
    }
  }

  async updateMemberProfile(
    userId: number,
    profile: Partial<InsertMemberProfile>
  ): Promise<MemberProfile> {
    try {
      const updateData: any = { ...profile };
      if (profile.height !== undefined) {
        updateData.height = profile.height.toString();
      }
      if (profile.weight !== undefined) {
        updateData.weight = profile.weight.toString();
      }
      updateData.updatedAt = new Date();

      const [updatedProfile] = await db
        .update(memberProfiles)
        .set(updateData)
        .where(eq(memberProfiles.userId, userId))
        .returning();
      return updatedProfile;
    } catch (error) {
      console.error("Error updating member profile:", error);
      throw error;
    }
  }

  async getMemberAssessments(
    memberId: number
  ): Promise<MemberAssessment[]> {
    try {
      return await db
        .select()
        .from(memberAssessments)
        .where(eq(memberAssessments.memberId, memberId))
        .orderBy(desc(memberAssessments.assessmentDate));
    } catch (error) {
      console.error("Error getting member assessments:", error);
      return [];
    }
  }

  async getMemberAssessment(
    id: number
  ): Promise<MemberAssessment | undefined> {
    try {
      const [assessment] = await db
        .select()
        .from(memberAssessments)
        .where(eq(memberAssessments.id, id));
      return assessment;
    } catch (error) {
      console.error("Error getting member assessment:", error);
      return undefined;
    }
  }

  async createMemberAssessment(
    assessment: InsertMemberAssessment
  ): Promise<MemberAssessment> {
    try {
      const [newAssessment] = await db
        .insert(memberAssessments)
        .values(assessment)
        .returning();
      return newAssessment;
    } catch (error) {
      console.error("Error creating member assessment:", error);
      throw error;
    }
  }

  async getMemberProgressPhotos(
    memberId: number
  ): Promise<MemberProgressPhoto[]> {
    try {
      return await db
        .select()
        .from(memberProgressPhotos)
        .where(eq(memberProgressPhotos.memberId, memberId))
        .orderBy(desc(memberProgressPhotos.photoDate));
    } catch (error) {
      console.error("Error getting member progress photos:", error);
      return [];
    }
  }

  async getMemberProgressPhoto(
    id: number
  ): Promise<MemberProgressPhoto | undefined> {
    try {
      const [photo] = await db
        .select()
        .from(memberProgressPhotos)
        .where(eq(memberProgressPhotos.id, id));
      return photo;
    } catch (error) {
      console.error("Error getting member progress photo:", error);
      return undefined;
    }
  }

  async createMemberProgressPhoto(
    photo: InsertMemberProgressPhoto
  ): Promise<MemberProgressPhoto> {
    try {
      const [newPhoto] = await db
        .insert(memberProgressPhotos)
        .values(photo)
        .returning();
      return newPhoto;
    } catch (error) {
      console.error("Error creating member progress photo:", error);
      throw error;
    }
  }

  async getWorkoutPlans(): Promise<WorkoutPlan[]> {
    try {
      return await db.select().from(workoutPlans);
    } catch (error) {
      console.error("Error getting workout plans:", error);
      return [];
    }
  }

  async getWorkoutPlansByMember(
    memberId: number
  ): Promise<WorkoutPlan[]> {
    try {
      return await db
        .select()
        .from(workoutPlans)
        .where(eq(workoutPlans.memberId, memberId));
    } catch (error) {
      console.error("Error getting workout plans by member:", error);
      return [];
    }
  }

  async getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined> {
    try {
      const [plan] = await db
        .select()
        .from(workoutPlans)
        .where(eq(workoutPlans.id, id));
      return plan;
    } catch (error) {
      console.error("Error getting workout plan:", error);
      return undefined;
    }
  }

  async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    try {
      const [newPlan] = await db
        .insert(workoutPlans)
        .values(plan)
        .returning();
      return newPlan;
    } catch (error) {
      console.error("Error creating workout plan:", error);
      throw error;
    }
  }

  async updateWorkoutPlanCompletionRate(
    id: number,
    completionRate: number
  ): Promise<WorkoutPlan> {
    try {
      const [updatedPlan] = await db
        .update(workoutPlans)
        .set({ completionRate: completionRate.toString() })
        .where(eq(workoutPlans.id, id))
        .returning();
      return updatedPlan;
    } catch (error) {
      console.error("Error updating workout plan completion rate:", error);
      throw error;
    }
  }

  async getWorkoutLogs(
    workoutPlanId: number
  ): Promise<WorkoutLog[]> {
    try {
      return await db
        .select()
        .from(workoutLogs)
        .where(eq(workoutLogs.workoutPlanId, workoutPlanId));
    } catch (error) {
      console.error("Error getting workout logs:", error);
      return [];
    }
  }

  async getMemberWorkoutLogs(
    memberId: number
  ): Promise<WorkoutLog[]> {
    try {
      return await db
        .select()
        .from(workoutLogs)
        .where(eq(workoutLogs.memberId, memberId));
    } catch (error) {
      console.error("Error getting member workout logs:", error);
      return [];
    }
  }

  async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
    try {
      const [newLog] = await db
        .insert(workoutLogs)
        .values(log)
        .returning();
      return newLog;
    } catch (error) {
      console.error("Error creating workout log:", error);
      throw error;
    }
  }

  async getSchedules(): Promise<Schedule[]> {
    try {
      return await db.select().from(schedules);
    } catch (error) {
      console.error("Error getting schedules:", error);
      return [];
    }
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    try {
      const [schedule] = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, id));
      return schedule;
    } catch (error) {
      console.error("Error getting schedule:", error);
      return undefined;
    }
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    try {
      const [newSchedule] = await db
        .insert(schedules)
        .values(schedule)
        .returning();
      return newSchedule;
    } catch (error) {
      console.error("Error creating schedule:", error);
      throw error;
    }
  }

  async getInvoices(): Promise<Invoice[]> {
    try {
      return await db.select().from(invoices);
    } catch (error) {
      console.error("Error getting invoices:", error);
      return [];
    }
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    try {
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id));
      return invoice;
    } catch (error) {
      console.error("Error getting invoice:", error);
      return undefined;
    }
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    try {
      const [newInvoice] = await db
        .insert(invoices)
        .values(invoice)
        .returning();
      return newInvoice;
    } catch (error) {
      console.error("Error creating invoice:", error);
      throw error;
    }
  }

  async getMarketingCampaigns(): Promise<MarketingCampaign[]> {
    try {
      return await db.select().from(marketingCampaigns);
    } catch (error) {
      console.error("Error getting marketing campaigns:", error);
      return [];
    }
  }

  async getMarketingCampaign(
    id: number
  ): Promise<MarketingCampaign | undefined> {
    try {
      const [campaign] = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.id, id));
      return campaign;
    } catch (error) {
      console.error("Error getting marketing campaign:", error);
      return undefined;
    }
  }

  async createMarketingCampaign(
    campaign: InsertMarketingCampaign
  ): Promise<MarketingCampaign> {
    try {
      const [newCampaign] = await db
        .insert(marketingCampaigns)
        .values(campaign)
        .returning();
      return newCampaign;
    } catch (error) {
      console.error("Error creating marketing campaign:", error);
      throw error;
    }
  }

  async getMuscleGroups(): Promise<MuscleGroup[]> {
    try {
      return await db.select().from(muscleGroups);
    } catch (error) {
      console.error("Error getting muscle groups:", error);
      return [];
    }
  }

  async getMuscleGroup(
    id: number
  ): Promise<MuscleGroup | undefined> {
    try {
      const [group] = await db
        .select()
        .from(muscleGroups)
        .where(eq(muscleGroups.id, id));
      return group;
    } catch (error) {
      console.error("Error getting muscle group:", error);
      return undefined;
    }
  }

  async createMuscleGroup(
    group: InsertMuscleGroup
  ): Promise<MuscleGroup> {
    try {
      const [newGroup] = await db
        .insert(muscleGroups)
        .values(group)
        .returning();
      return newGroup;
    } catch (error) {
      console.error("Error creating muscle group:", error);
      throw error;
    }
  }

  async getExercises(): Promise<Exercise[]> {
    try {
      return await db.select().from(exercises);
    } catch (error) {
      console.error("Error getting exercises:", error);
      return [];
    }
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    try {
      const [exercise] = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, id));
      return exercise;
    } catch (error) {
      console.error("Error getting exercise:", error);
      return undefined;
    }
  }

  async getExercisesByMuscleGroup(
    muscleGroupId: number
  ): Promise<Exercise[]> {
    try {
      return await db
        .select()
        .from(exercises)
        .where(
          sql`${exercises.primaryMuscleGroupId} = ${muscleGroupId} OR ${muscleGroupId} = ANY(${exercises.secondaryMuscleGroupIds})`
        );
    } catch (error) {
      console.error("Error getting exercises by muscle group:", error);
      return [];
    }
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    try {
      const [newExercise] = await db
        .insert(exercises)
        .values(exercise)
        .returning();
      return newExercise;
    } catch (error) {
      console.error("Error creating exercise:", error);
      throw error;
    }
  }

  async getPricingPlans(): Promise<PricingPlan[]> {
    try {
      return await db
        .select()
        .from(pricingPlans)
        .orderBy(pricingPlans.sessionsPerWeek, pricingPlans.duration);
    } catch (error) {
      console.error("Error getting pricing plans:", error);
      return [];
    }
  }

  async getPricingPlan(
    id: number
  ): Promise<PricingPlan | undefined> {
    try {
      const [plan] = await db
        .select()
        .from(pricingPlans)
        .where(eq(pricingPlans.id, id));
      return plan;
    } catch (error) {
      console.error("Error getting pricing plan:", error);
      return undefined;
    }
  }

  async createPricingPlan(
    plan: InsertPricingPlan
  ): Promise<PricingPlan> {
    try {
      const [newPlan] = await db
        .insert(pricingPlans)
        .values({
          ...plan,
          updatedAt: new Date(),
        })
        .returning();
      return newPlan;
    } catch (error) {
      console.error("Error creating pricing plan:", error);
      throw error;
    }
  }

  async updatePricingPlan(
    id: number,
    plan: Partial<InsertPricingPlan>
  ): Promise<PricingPlan> {
    try {
      const [updatedPlan] = await db
        .update(pricingPlans)
        .set({
          ...plan,
          updatedAt: new Date(),
        })
        .where(eq(pricingPlans.id, id))
        .returning();
      return updatedPlan;
    } catch (error) {
      console.error("Error updating pricing plan:", error);
      throw error;
    }
  }

  async getMembershipPricing(): Promise<MembershipPricing[]> {
    try {
      return await db
        .select()
        .from(membershipPricing)
        .where(eq(membershipPricing.isActive, true))
        .orderBy(membershipPricing.gymLocation);
    } catch (error) {
      console.error("Error getting membership pricing:", error);
      return [];
    }
  }

  async getMembershipPricingById(
    id: number
  ): Promise<MembershipPricing | undefined> {
    try {
      const [pricing] = await db
        .select()
        .from(membershipPricing)
        .where(eq(membershipPricing.id, id));
      return pricing;
    } catch (error) {
      console.error("Error getting membership pricing by ID:", error);
      return undefined;
    }
  }

  async createMembershipPricing(
    pricing: InsertMembershipPricing
  ): Promise<MembershipPricing> {
    try {
      const [newPricing] = await db
        .insert(membershipPricing)
        .values({
          ...pricing,
          membershipTier1: pricing.membershipTier1.toString(),
          membershipTier2: pricing.membershipTier2.toString(),
          membershipTier3: pricing.membershipTier3.toString(),
          membershipTier4: pricing.membershipTier4.toString(),
          isActive: true,
          updatedAt: new Date(),
        })
        .returning();
      return newPricing;
    } catch (error) {
      console.error("Error creating membership pricing:", error);
      throw error;
    }
  }

  async updateMembershipPricing(
    id: number,
    pricing: Partial<InsertMembershipPricing>
  ): Promise<MembershipPricing> {
    try {
      const updateData: any = { ...pricing };
      if (pricing.membershipTier1 !== undefined) {
        updateData.membershipTier1 = pricing.membershipTier1.toString();
      }
      if (pricing.membershipTier2 !== undefined) {
        updateData.membershipTier2 = pricing.membershipTier2.toString();
      }
      if (pricing.membershipTier3 !== undefined) {
        updateData.membershipTier3 = pricing.membershipTier3.toString();
      }
      if (pricing.membershipTier4 !== undefined) {
        updateData.membershipTier4 = pricing.membershipTier4.toString();
      }
      updateData.updatedAt = new Date();

      const [updatedPricing] = await db
        .update(membershipPricing)
        .set(updateData)
        .where(eq(membershipPricing.id, id))
        .returning();
      return updatedPricing;
    } catch (error) {
      console.error("Error updating membership pricing:", error);
      throw error;
    }
  }

  async deleteMembershipPricing(id: number): Promise<void> {
    try {
      await db
        .update(membershipPricing)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(membershipPricing.id, id));
    } catch (error) {
      console.error("Error deleting membership pricing:", error);
      throw error;
    }
  }

  async getAllMembershipPricing(): Promise<MembershipPricing[]> {
    try {
      return await db
        .select()
        .from(membershipPricing)
        .orderBy(membershipPricing.gymLocation);
    } catch (error) {
      console.error("Error getting all membership pricing:", error);
      return [];
    }
  }

  // Meal Plans
  async getMealPlans(): Promise<MealPlan[]> {
    try {
      return await db.select().from(mealPlans);
    } catch (error) {
      console.error("Error getting meal plans:", error);
      return [];
    }
  }

  async getMealPlan(id: number): Promise<MealPlan | null> {
    try {
      const results = await db
        .select()
        .from(mealPlans)
        .where(eq(mealPlans.id, id));
      return results[0] || null;
    } catch (error) {
      console.error("Error getting meal plan:", error);
      return null;
    }
  }

  async createMealPlan(data: InsertMealPlan): Promise<MealPlan> {
    try {
      const results = await db
        .insert(mealPlans)
        .values(data)
        .returning();
      return results[0];
    } catch (error) {
      console.error("Error creating meal plan:", error);
      throw error;
    }
  }

  async updateMealPlan(
    id: number,
    data: Partial<InsertMealPlan>
  ): Promise<MealPlan> {
    try {
      const results = await db
        .update(mealPlans)
        .set(data)
        .where(eq(mealPlans.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error("Error updating meal plan:", error);
      throw error;
    }
  }

  async deleteMealPlan(id: number): Promise<void> {
    try {
      await db.delete(mealPlans).where(eq(mealPlans.id, id));
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      throw error;
    }
  }

  // Member Meal Plans
  async getMemberMealPlans(
    memberId: number
  ): Promise<MemberMealPlan[]> {
    try {
      return await db
        .select()
        .from(memberMealPlans)
        .where(eq(memberMealPlans.memberId, memberId));
    } catch (error) {
      console.error("Error getting member meal plans:", error);
      return [];
    }
  }

  async getMemberMealPlan(
    id: number
  ): Promise<MemberMealPlan | null> {
    try {
      const results = await db
        .select()
        .from(memberMealPlans)
        .where(eq(memberMealPlans.id, id));
      return results[0] || null;
    } catch (error) {
      console.error("Error getting member meal plan:", error);
      return null;
    }
  }

  async createMemberMealPlan(
    data: InsertMemberMealPlan
  ): Promise<MemberMealPlan> {
    try {
      const results = await db
        .insert(memberMealPlans)
        .values(data)
        .returning();
      return results[0];
    } catch (error) {
      console.error("Error creating member meal plan:", error);
      throw error;
    }
  }

  async updateMemberMealPlan(
    id: number,
    data: Partial<InsertMemberMealPlan>
  ): Promise<MemberMealPlan> {
    try {
      const results = await db
        .update(memberMealPlans)
        .set(data)
        .where(eq(memberMealPlans.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error("Error updating member meal plan:", error);
      throw error;
    }
  }

  async deleteMemberMealPlan(id: number): Promise<void> {
    try {
      await db.delete(memberMealPlans).where(eq(memberMealPlans.id, id));
    } catch (error) {
      console.error("Error deleting member meal plan:", error);
      throw error;
    }
  }

  // Progress tracking implementation
  async getMemberProgress(
    memberId: number
  ): Promise<Progress[]> {
    try {
      return await db
        .select()
        .from(progress)
        .where(eq(progress.memberId, memberId))
        .orderBy(desc(progress.progressDate));
    } catch (error) {
      console.error("Error getting member progress:", error);
      return [];
    }
  }

  async getProgress(id: number): Promise<Progress | undefined> {
    try {
      const [record] = await db
        .select()
        .from(progress)
        .where(eq(progress.id, id));
      return record;
    } catch (error) {      console.error("Error getting progress:", error);
      return undefined;
    }
  }

  async createProgress(data: InsertProgress): Promise<Progress> {
    try {
      const [newProgress] = await db
        .insert(progress)
        .values({
          ...data,
          progressDate: new Date(),
        })
        .returning();
      return newProgress;
    } catch (error) {
      console.error("Error creating progress:", error);
      throw error;
    }
  }

  async updateProgress(
    id: number,
    data: Partial<InsertProgress>
  ): Promise<Progress> {
    try {
      const [updatedProgress] = await db
        .update(progress)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(progress.id, id))
        .returning();
      return updatedProgress;
    } catch (error) {
      console.error("Error updating progress:", error);
      throw error;
    }
  }

  // Strength metrics implementation
  async getMemberStrengthMetrics(
    memberId: number
  ): Promise<StrengthMetric[]> {
    try {
      return await db
        .select()
        .from(strengthMetrics)
        .innerJoin(progress, eq(strengthMetrics.progressId, progress.id))
        .where(eq(progress.memberId, memberId))
        .orderBy(desc(progress.progressDate));
    } catch (error) {
      console.error("Error getting member strength metrics:", error);
      return [];
    }
  }

  async getProgressStrengthMetrics(
    progressId: number
  ): Promise<StrengthMetric[]> {
    try {
      return await db
        .select()
        .from(strengthMetrics)
        .where(eq(strengthMetrics.progressId, progressId))
        .orderBy(strengthMetrics.exerciseId);
    } catch (error) {
      console.error("Error getting progress strength metrics:", error);
      return [];
    }
  }

  async createStrengthMetric(
    metric: InsertStrengthMetric
  ): Promise<StrengthMetric> {
    try {
      const [newMetric] = await db
        .insert(strengthMetrics)
        .values(metric)
        .returning();
      return newMetric;
    } catch (error) {
      console.error("Error creating strength metric:", error);
      throw error;
    }
  }

  // Movement Pattern implementations
  async getMovementPatterns(): Promise<MovementPattern[]> {
    try {
      return await db.select().from(movementPatterns);
    } catch (error) {
      console.error("Error getting movement patterns:", error);
      return [];
    }
  }

  async getMovementPattern(
    id: number
  ): Promise<MovementPattern | undefined> {
    try {
      const [pattern] = await db
        .select()
        .from(movementPatterns)
        .where(eq(movementPatterns.id, id));
      return pattern;
    } catch (error) {
      console.error("Error getting movement pattern:", error);
      return undefined;
    }
  }

  async createMovementPattern(
    pattern: InsertMovementPattern
  ): Promise<MovementPattern> {
    try {
      const [newPattern] = await db
        .insert(movementPatterns)
        .values(pattern)
        .returning();
      return newPattern;
    } catch (error) {
      console.error("Error creating movement pattern:", error);
      throw error;
    }
  }

  // Training Package implementations
  async getTrainingPackages(): Promise<TrainingPackage[]> {
    try {
      return await db
        .select()
        .from(trainingPackages)
        .where(eq(trainingPackages.isActive, true));
    } catch (error) {
      console.error("Error getting training packages:", error);
      return [];
    }
  }

  async getTrainingPackage(
    id: number
  ): Promise<TrainingPackage | undefined> {
    try {
      const [pkg] = await db
        .select()
        .from(trainingPackages)
        .where(eq(trainingPackages.id, id));
      return pkg;
    } catch (error) {
      console.error("Error getting training package:", error);
      return undefined;
    }
  }

  async createTrainingPackage(
    pkg: InsertTrainingPackage
  ): Promise<TrainingPackage> {
    try {
      const [newPkg] = await db
        .insert(trainingPackages)
        .values(pkg)
        .returning();
      return newPkg;
    } catch (error) {
      console.error("Error creating training package:", error);
      throw error;
    }
  }

  async updateTrainingPackage(
    id: number,
    pkg: Partial<InsertTrainingPackage>
  ): Promise<TrainingPackage> {
    try {
      const [updatedPkg] = await db
        .update(trainingPackages)
        .set({ ...pkg, updatedAt: new Date() })
        .where(eq(trainingPackages.id, id))
        .returning();
      return updatedPkg;
    } catch (error) {
      console.error("Error updating training package:", error);
      throw error;
    }
  }

  // Training Client implementations
  async getTrainingClients(): Promise<TrainingClient[]> {
    try {
      return await db.select().from(trainingClients);
    } catch (error) {
      console.error("Error getting training clients:", error);
      return [];
    }
  }

  async getTrainingClientsByTrainer(
    trainerId: number
  ): Promise<TrainingClient[]> {
    try {
      return await db
        .select()
        .from(trainingClients)
        .where(eq(trainingClients.assignedTrainerId, trainerId));
    } catch (error) {
      console.error("Error getting training clients by trainer:", error);
      return [];
    }
  }

  async getTrainingClient(
    id: number
  ): Promise<TrainingClient | undefined> {
    try {
      const [client] = await db
        .select()
        .from(trainingClients)
        .where(eq(trainingClients.id, id));
      return client;
    } catch (error) {
      console.error("Error getting training client:", error);
      return undefined;
    }
  }

  async createTrainingClient(
    client: InsertTrainingClient
  ): Promise<TrainingClient> {
    try {
      const [newClient] = await db
        .insert(trainingClients)
        .values(client)
        .returning();
      return newClient;
    } catch (error) {
      console.error("Error creating training client:", error);
      throw error;
    }
  }

  async updateTrainingClientStatus(
    id: number,
    status: string
  ): Promise<TrainingClient> {
    try {
      const [updatedClient] = await db
        .update(trainingClients)
        .set({ clientStatus: status })
        .where(eq(trainingClients.id, id))
        .returning();
      return updatedClient;
    } catch (error) {
      console.error("Error updating training client status:", error);
      throw error;
    }
  }

  async updateTrainingClientSessions(
    id: number,
    sessionsRemaining: number
  ): Promise<TrainingClient> {
    try {
      const [updatedClient] = await db
        .update(trainingClients)
        .set({ sessionsRemaining })
        .where(eq(trainingClients.id, id))
        .returning();
      return updatedClient;
    } catch (error) {
      console.error("Error updating training client sessions:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();

// Database schema queries
const INIT_DB = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  assignedTrainerId INTEGER REFERENCES users(id),
  membership_type VARCHAR(50),
  membership_status VARCHAR(50),
  gym_location_id INTEGER,
  birth_date DATE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  trainer_id INTEGER REFERENCES users(id),
  name VARCHAR(255),
  description TEXT,
  frequency_per_week INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_assessments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  trainer_id INTEGER REFERENCES users(id),
  assessment_date TIMESTAMP WITH TIME ZONE,
  weight DECIMAL,
  body_fat_percentage DECIMAL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS workout_logs (
  id SERIAL PRIMARY KEY,
  workout_plan_id INTEGER REFERENCES workout_plans(id),
  member_id INTEGER REFERENCES members(id),
  exercise_id INTEGER REFERENCES exercises(id),
  sets INTEGER,
  reps INTEGER,
  weight DECIMAL,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  trainer_id INTEGER REFERENCES users(id),
  day VARCHAR(10),
  time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  invoice_date TIMESTAMP WITH TIME ZONE,
  amount DECIMAL,
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  height VARCHAR(10),
  weight VARCHAR(10),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  allergies TEXT,
  medical_conditions TEXT,
  goals TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_progress_photos (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  photo_date TIMESTAMP WITH TIME ZONE,
  photo_url VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pricing_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  sessions_per_week INTEGER,
  duration VARCHAR(50),
  price DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  primary_muscle_group_id INTEGER REFERENCES muscle_groups(id),
  secondary_muscle_group_ids INTEGER[] DEFAULT '{}',
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS muscle_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS membership_pricing (
  id SERIAL PRIMARY KEY,
  gymLocation VARCHAR(255) NOT NULL,
  planName VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  membershipTier1 DECIMAL(10,2),
  membershipTier2 DECIMAL(10,2),
  membershipTier3 DECIMAL(10,2),
  membershipTier4 DECIMAL(10,2),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  meals JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_meal_plans (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  meal_plan_id INTEGER REFERENCES meal_plans(id),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS progress (
  id SERIAL PRIMARY KEY,
  memberId INTEGER REFERENCES members(id),
  progressDate TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strengthMetrics (
  id SERIAL PRIMARY KEY,
  progressId INTEGER REFERENCES progress(id),
  exerciseId INTEGER REFERENCES exercises(id),
  weight DECIMAL,
  reps INTEGER,
  sets INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movement_patterns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  sessions_included INTEGER NOT NULL,
  duration VARCHAR(50) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_clients (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id),
  assignedTrainerId INTEGER REFERENCES users(id),
  packageId INTEGER REFERENCES training_packages(id),
  sessionsRemaining INTEGER NOT NULL,
  clientStatus VARCHAR(50) NOT NULL,
  startDate TIMESTAMP WITH TIME ZONE,
  endDate TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;