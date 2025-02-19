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
  status: text("status", { enum: ["active", "completed", "cancelled"] }).notNull(),
  frequencyPerWeek: integer("frequency_per_week").notNull(),
  completionRate: numeric("completion_rate").default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  workoutPlanId: integer("workout_plan_id").references(() => workoutPlans.id).notNull(),
  completedAt: timestamp("completed_at").notNull(),
  duration: integer("duration").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
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

export const muscleGroups = pgTable("muscle_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  bodyRegion: text("body_region", { enum: ["upper", "lower", "core"] }).notNull()
});

export const movementPatterns = pgTable("movement_patterns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  type: text("type", { 
    enum: ["push", "pull", "squat", "hinge", "lunge", "rotation", "gait"] 
  }).notNull()
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  difficulty: text("difficulty", { 
    enum: ["beginner", "intermediate", "advanced"] 
  }).notNull(),
  movementPatternId: integer("movement_pattern_id").references(() => movementPatterns.id).notNull(),
  primaryMuscleGroupId: integer("primary_muscle_group_id").references(() => muscleGroups.id).notNull(),
  secondaryMuscleGroupIds: integer("secondary_muscle_group_ids").array().notNull(),
  instructions: text("instructions").array().notNull(),
  tips: text("tips").array(),
  equipment: text("equipment").array(),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertUserSchema = createInsertSchema(users);
export const insertMemberSchema = createInsertSchema(members);
export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans)
  .extend({
    title: z.string().min(3, "Title must be at least 3 characters long"),
    description: z.string().min(10, "Description must be at least 10 characters long"),
    frequencyPerWeek: z.number().min(1, "Must train at least once per week").max(7, "Cannot exceed 7 sessions per week"),
    memberId: z.number().nullable().refine((val) => val === null || val > 0, {
      message: "Member ID must be a positive number"
    }),
    status: z.enum(["active", "completed", "cancelled"]).default("active"),
    completionRate: z.string().default("0"),
  });
export const insertWorkoutLogSchema = createInsertSchema(workoutLogs);
export const insertScheduleSchema = createInsertSchema(schedules);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns);
export const insertMuscleGroupSchema = createInsertSchema(muscleGroups);
export const insertMovementPatternSchema = createInsertSchema(movementPatterns);
export const insertExerciseSchema = createInsertSchema(exercises)
  .extend({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    instructions: z.array(z.string()).min(1, "Must include at least one instruction"),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type MuscleGroup = typeof muscleGroups.$inferSelect;
export type InsertMuscleGroup = z.infer<typeof insertMuscleGroupSchema>;
export type MovementPattern = typeof movementPatterns.$inferSelect;
export type InsertMovementPattern = z.infer<typeof insertMovementPatternSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;