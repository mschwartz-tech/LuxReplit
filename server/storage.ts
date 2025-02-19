import { User, InsertUser, Member, InsertMember, WorkoutPlan, InsertWorkoutPlan, WorkoutLog, InsertWorkoutLog, Schedule, InsertSchedule, Invoice, InsertInvoice, MarketingCampaign, InsertMarketingCampaign, MemberProfile, InsertMemberProfile, MemberAssessment, InsertMemberAssessment, MemberProgressPhoto, InsertMemberProgressPhoto, TrainingClient, InsertTrainingClient } from "@shared/schema";
import session from "express-session";
import { 
  users, members, workoutPlans, workoutLogs, schedules, invoices, marketingCampaigns,
  exercises, muscleGroups, memberProfiles, memberAssessments, memberProgressPhotos,
  trainingClients,
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

  // New methods for gym members
  getGymMembers(): Promise<Member[]>;
  getGymMember(id: number): Promise<Member | undefined>;
  createGymMember(member: InsertMember): Promise<Member>;

  // New methods for training clients
  getTrainingClients(): Promise<TrainingClient[]>;
  getTrainingClientsByTrainer(trainerId: number): Promise<TrainingClient[]>;
  getTrainingClient(id: number): Promise<TrainingClient | undefined>;
  createTrainingClient(client: InsertTrainingClient): Promise<TrainingClient>;
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
      .where(eq(memberProfiles.memberId, memberId));
    return profile;
  }

  async createMemberProfile(profile: InsertMemberProfile): Promise<MemberProfile> {
    const [newProfile] = await db
      .insert(memberProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateMemberProfile(
    memberId: number,
    profile: Partial<InsertMemberProfile>
  ): Promise<MemberProfile> {
    const [updatedProfile] = await db
      .update(memberProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(memberProfiles.memberId, memberId))
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

  // Gym member methods
  async getGymMembers(): Promise<Member[]> {
    return await db.select().from(members);
  }

  async getGymMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async createGymMember(member: InsertMember): Promise<Member> {
    const [newMember] = await db.insert(members).values(member).returning();
    return newMember;
  }

  // Training client methods
  async getTrainingClients(): Promise<TrainingClient[]> {
    return await db.select().from(trainingClients);
  }

  async getTrainingClientsByTrainer(trainerId: number): Promise<TrainingClient[]> {
    return await db.select()
      .from(trainingClients)
      .where(eq(trainingClients.assignedTrainerId, trainerId));
  }

  async getTrainingClient(id: number): Promise<TrainingClient | undefined> {
    const [client] = await db.select()
      .from(trainingClients)
      .where(eq(trainingClients.id, id));
    return client;
  }

  async createTrainingClient(client: InsertTrainingClient): Promise<TrainingClient> {
    const [newClient] = await db.insert(trainingClients).values(client).returning();
    return newClient;
  }
}

export const storage = new DatabaseStorage();