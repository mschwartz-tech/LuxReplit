import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "trainer", "member"] }).notNull(),
  email: text("email").notNull(),
  name: text("name").notNull()
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  joinDate: timestamp("join_date").notNull().defaultNow(),
  status: text("status", { enum: ["active", "inactive"] }).notNull(),
  assignedTrainerId: integer("assigned_trainer_id").references(() => users.id)
});

export const workoutPlans = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  trainerId: integer("trainer_id").references(() => users.id),
  memberId: integer("member_id").references(() => members.id),
  status: text("status", { enum: ["active", "completed", "cancelled"] }).notNull()
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id),
  memberId: integer("member_id").references(() => members.id),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull()
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  amount: numeric("amount").notNull(),
  status: text("status", { enum: ["pending", "paid", "cancelled"] }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetAudience: text("target_audience", { enum: ["all", "active", "inactive"] }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status", { enum: ["draft", "active", "completed"] }).notNull(),
  createdBy: integer("created_by").references(() => users.id)
});

export const insertUserSchema = createInsertSchema(users);
export const insertMemberSchema = createInsertSchema(members);
export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans);
export const insertScheduleSchema = createInsertSchema(schedules);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;