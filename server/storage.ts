import { User, InsertUser, Member, InsertMember, WorkoutPlan, InsertWorkoutPlan, WorkoutLog, InsertWorkoutLog, Schedule, InsertSchedule, Invoice, InsertInvoice, MarketingCampaign, InsertMarketingCampaign } from "@shared/schema";
import session from "express-session";
import { users, members, workoutPlans, workoutLogs, schedules, invoices, marketingCampaigns } from "@shared/schema";
import { eq, and } from "drizzle-orm";
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
  getMember(id: number): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;

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

  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async createMember(member: InsertMember): Promise<Member> {
    const [newMember] = await db.insert(members).values(member).returning();
    return newMember;
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
}

export const storage = new DatabaseStorage();