import { User, InsertUser, Member, InsertMember, WorkoutPlan, InsertWorkoutPlan, WorkoutLog, InsertWorkoutLog, Schedule, InsertSchedule, Invoice, InsertInvoice, MarketingCampaign, InsertMarketingCampaign, MemberProfile, InsertMemberProfile, MemberAssessment, InsertMemberAssessment, MemberProgressPhoto, InsertMemberProgressPhoto, PricingPlan, InsertPricingPlan, GymMembershipPricing, InsertGymMembershipPricing } from "@shared/schema";
import session from "express-session";
import {
  users, members, workoutPlans, workoutLogs, schedules, invoices, marketingCampaigns,
  exercises, muscleGroups, memberProfiles, memberAssessments, memberProgressPhotos, pricingPlans, gymMembershipPricing,
  type Exercise, type InsertExercise,
  type MuscleGroup, type InsertMuscleGroup
} from "@shared/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { db } from "./db";

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
  updateMemberProfile(memberId: number, profile: Partial<InsertMemberProfile>): Promise<MemberProfile>;

  // Member assessment operations
  getMemberAssessments(memberId: number): Promise<MemberAssessment[]>;
  getMemberAssessment(id: number): Promise<MemberAssessment | undefined>;
  createMemberAssessment(assessment: InsertMemberAssessment): Promise<MemberAssessment>;

  // Member progress photo operations
  getMemberProgressPhotos(memberId: number): Promise<MemberProgressPhoto[]>;
  getMemberProgressPhoto(id: number): Promise<MemberProgressPhoto | undefined>;
  createMemberProgressPhoto(photo: InsertMemberProgressPhoto): Promise<MemberProgressPhoto>;

  // Workout plan operations
  getWorkoutPlans(): Promise<WorkoutPlan[]>;
  getWorkoutPlansByMember(memberId: number): Promise<WorkoutPlan[]>;
  getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined>;
  createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan>;
  updateWorkoutPlanCompletionRate(id: number, completionRate: number): Promise<WorkoutPlan>;

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
  createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign>;

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
  updatePricingPlan(id: number, plan: Partial<InsertPricingPlan>): Promise<PricingPlan>;

  // Gym Membership Pricing operations
  getGymMembershipPricing(): Promise<GymMembershipPricing[]>;
  getGymMembershipPricingById(id: number): Promise<GymMembershipPricing | undefined>;
  createGymMembershipPricing(pricing: InsertGymMembershipPricing): Promise<GymMembershipPricing>;
  updateGymMembershipPricing(id: number, pricing: Partial<InsertGymMembershipPricing>): Promise<GymMembershipPricing>;
  deleteGymMembershipPricing(id: number): Promise<void>;
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getMembers(): Promise<Member[]> {
    return await db.select().from(members);
  }

  async getMembersByTrainer(trainerId: number): Promise<Member[]> {
    return await db.select()
      .from(members)
      .where(eq(members.assignedTrainerId, trainerId));
  }

  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async createMember(member: InsertMember): Promise<Member> {
    const [newMember] = await db.insert(members).values(member).returning();
    return newMember;
  }

  async getMemberProfile(memberId: number): Promise<MemberProfile | undefined> {
    const [profile] = await db
      .select()
      .from(memberProfiles)
      .where(eq(memberProfiles.userId, memberId));
    return profile;
  }

  async createMemberProfile(profile: InsertMemberProfile): Promise<MemberProfile> {
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
  }

  async updateMemberProfile(
    userId: number,
    profile: Partial<InsertMemberProfile>
  ): Promise<MemberProfile> {
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
  }

  async getMemberAssessments(memberId: number): Promise<MemberAssessment[]> {
    return await db
      .select()
      .from(memberAssessments)
      .where(eq(memberAssessments.memberId, memberId))
      .orderBy(desc(memberAssessments.assessmentDate));
  }

  async getMemberAssessment(id: number): Promise<MemberAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(memberAssessments)
      .where(eq(memberAssessments.id, id));
    return assessment;
  }

  async createMemberAssessment(assessment: InsertMemberAssessment): Promise<MemberAssessment> {
    const [newAssessment] = await db
      .insert(memberAssessments)
      .values(assessment)
      .returning();
    return newAssessment;
  }

  async getMemberProgressPhotos(memberId: number): Promise<MemberProgressPhoto[]> {
    return await db
      .select()
      .from(memberProgressPhotos)
      .where(eq(memberProgressPhotos.memberId, memberId))
      .orderBy(desc(memberProgressPhotos.photoDate));
  }

  async getMemberProgressPhoto(id: number): Promise<MemberProgressPhoto | undefined> {
    const [photo] = await db
      .select()
      .from(memberProgressPhotos)
      .where(eq(memberProgressPhotos.id, id));
    return photo;
  }

  async createMemberProgressPhoto(photo: InsertMemberProgressPhoto): Promise<MemberProgressPhoto> {
    const [newPhoto] = await db
      .insert(memberProgressPhotos)
      .values(photo)
      .returning();
    return newPhoto;
  }

  async getWorkoutPlans(): Promise<WorkoutPlan[]> {
    return await db.select().from(workoutPlans);
  }

  async getWorkoutPlansByMember(memberId: number): Promise<WorkoutPlan[]> {
    return await db.select().from(workoutPlans).where(eq(workoutPlans.memberId, memberId));
  }

  async getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined> {
    const [plan] = await db.select().from(workoutPlans).where(eq(workoutPlans.id, id));
    return plan;
  }

  async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const [newPlan] = await db.insert(workoutPlans).values(plan).returning();
    return newPlan;
  }

  async updateWorkoutPlanCompletionRate(id: number, completionRate: number): Promise<WorkoutPlan> {
    const [updatedPlan] = await db
      .update(workoutPlans)
      .set({ completionRate: completionRate.toString() })
      .where(eq(workoutPlans.id, id))
      .returning();
    return updatedPlan;
  }

  async getWorkoutLogs(workoutPlanId: number): Promise<WorkoutLog[]> {
    return await db.select().from(workoutLogs).where(eq(workoutLogs.workoutPlanId, workoutPlanId));
  }

  async getMemberWorkoutLogs(memberId: number): Promise<WorkoutLog[]> {
    return await db.select().from(workoutLogs).where(eq(workoutLogs.memberId, memberId));
  }

  async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
    const [newLog] = await db.insert(workoutLogs).values(log).returning();
    return newLog;
  }

  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules);
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule;
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values(schedule).returning();
    return newSchedule;
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async getMarketingCampaigns(): Promise<MarketingCampaign[]> {
    return await db.select().from(marketingCampaigns);
  }

  async getMarketingCampaign(id: number): Promise<MarketingCampaign | undefined> {
    const [campaign] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    return campaign;
  }

  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const [newCampaign] = await db.insert(marketingCampaigns).values(campaign).returning();
    return newCampaign;
  }

  async getMuscleGroups(): Promise<MuscleGroup[]> {
    return await db.select().from(muscleGroups);
  }

  async getMuscleGroup(id: number): Promise<MuscleGroup | undefined> {
    const [group] = await db.select().from(muscleGroups).where(eq(muscleGroups.id, id));
    return group;
  }

  async createMuscleGroup(group: InsertMuscleGroup): Promise<MuscleGroup> {
    const [newGroup] = await db.insert(muscleGroups).values(group).returning();
    return newGroup;
  }

  async getExercises(): Promise<Exercise[]> {
    return await db.select().from(exercises);
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async getExercisesByMuscleGroup(muscleGroupId: number): Promise<Exercise[]> {
    return await db.select()
      .from(exercises)
      .where(sql`${exercises.primaryMuscleGroupId} = ${muscleGroupId} OR ${muscleGroupId} = ANY(${exercises.secondaryMuscleGroupIds})`);
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [newExercise] = await db.insert(exercises).values(exercise).returning();
    return newExercise;
  }


  async getPricingPlans(): Promise<PricingPlan[]> {
    return await db.select().from(pricingPlans)
      .orderBy(pricingPlans.sessionsPerWeek, pricingPlans.duration);
  }

  async getPricingPlan(id: number): Promise<PricingPlan | undefined> {
    const [plan] = await db.select().from(pricingPlans).where(eq(pricingPlans.id, id));
    return plan;
  }

  async createPricingPlan(plan: InsertPricingPlan): Promise<PricingPlan> {
    const [newPlan] = await db.insert(pricingPlans)
      .values({
        ...plan,
        updatedAt: new Date(),
      })
      .returning();
    return newPlan;
  }

  async updatePricingPlan(id: number, plan: Partial<InsertPricingPlan>): Promise<PricingPlan> {
    const [updatedPlan] = await db.update(pricingPlans)
      .set({
        ...plan,
        updatedAt: new Date(),
      })
      .where(eq(pricingPlans.id, id))
      .returning();
    return updatedPlan;
  }

  async getGymMembershipPricing(): Promise<GymMembershipPricing[]> {
    return await db.select()
      .from(gymMembershipPricing)
      .where(eq(gymMembershipPricing.isActive, true))
      .orderBy(gymMembershipPricing.gymName);
  }

  async getGymMembershipPricingById(id: number): Promise<GymMembershipPricing | undefined> {
    const [pricing] = await db.select()
      .from(gymMembershipPricing)
      .where(eq(gymMembershipPricing.id, id));
    return pricing;
  }

  async createGymMembershipPricing(pricing: InsertGymMembershipPricing): Promise<GymMembershipPricing> {
    const [newPricing] = await db.insert(gymMembershipPricing)
      .values({
        ...pricing,
        luxeEssentialsPrice: pricing.luxeEssentialsPrice.toString(),
        luxeStrivePrice: pricing.luxeStrivePrice.toString(),
        luxeAllAccessPrice: pricing.luxeAllAccessPrice.toString(),
        updatedAt: new Date(),
        isActive: true
      })
      .returning();
    return newPricing;
  }

  async updateGymMembershipPricing(
    id: number,
    pricing: Partial<InsertGymMembershipPricing>
  ): Promise<GymMembershipPricing> {
    const updateData: any = { ...pricing };
    if (pricing.luxeEssentialsPrice !== undefined) {
      updateData.luxeEssentialsPrice = pricing.luxeEssentialsPrice.toString();
    }
    if (pricing.luxeStrivePrice !== undefined) {
      updateData.luxeStrivePrice = pricing.luxeStrivePrice.toString();
    }
    if (pricing.luxeAllAccessPrice !== undefined) {
      updateData.luxeAllAccessPrice = pricing.luxeAllAccessPrice.toString();
    }
    updateData.updatedAt = new Date();

    const [updatedPricing] = await db.update(gymMembershipPricing)
      .set(updateData)
      .where(eq(gymMembershipPricing.id, id))
      .returning();
    return updatedPricing;
  }

  async deleteGymMembershipPricing(id: number): Promise<void> {
    await db.update(gymMembershipPricing)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(gymMembershipPricing.id, id));
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

CREATE TABLE IF NOT EXISTS gym_membership_pricing (
  id SERIAL PRIMARY KEY,
  gym_name VARCHAR(255) NOT NULL,
  luxe_essentials_price DECIMAL(10,2) NOT NULL,
  luxe_strive_price DECIMAL(10,2) NOT NULL,
  luxe_all_access_price DECIMAL(10,2) NOT NULL,
  isactive BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
`;