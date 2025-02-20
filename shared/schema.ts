import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", {
    enum: ["admin", "trainer", "user"]
  }).notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assignedTrainerId: integer("assigned_trainer_id").references(() => users.id),
  membershipType: text("membership_type", {
    enum: ["standard", "premium", "vip"]
  }).notNull(),
  membershipStatus: text("membership_status", {
    enum: ["active", "inactive", "suspended"]
  }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});


export const memberProfiles = pgTable("member_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  height: text("height"),  // Store as text to handle various formats
  weight: text("weight"),  // Store as text to handle various formats
  goals: text("goals").array(),
  healthConditions: text("health_conditions").array(),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const memberAssessments = pgTable("member_assessments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  assessmentDate: timestamp("assessment_date").notNull(),
  weight: numeric("weight"),  // in kg
  bodyFatPercentage: numeric("body_fat_percentage"),
  measurements: jsonb("measurements").notNull(), // chest, waist, hips, etc.
  notes: text("notes"),
  trainerId: integer("trainer_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const memberProgressPhotos = pgTable("member_progress_photos", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  photoUrl: text("photo_url").notNull(),
  photoDate: timestamp("photo_date").notNull(),
  category: text("category", { enum: ["front", "back", "side"] }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
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

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  difficulty: text("difficulty", {
    enum: ["beginner", "intermediate", "advanced"]
  }).notNull(),
  primaryMuscleGroupId: integer("primary_muscle_group_id").references(() => muscleGroups.id).notNull(),
  secondaryMuscleGroupIds: integer("secondary_muscle_group_ids").array().notNull(),
  instructions: text("instructions").array().notNull(),
  tips: text("tips").array(),
  equipment: text("equipment").array(),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const pricingPlans = pgTable("pricing_plans", {
  id: serial("id").primaryKey(),
  sessionsPerWeek: integer("sessions_per_week").notNull(),
  duration: integer("duration").notNull(), // 30 or 60 minutes
  costPerSession: numeric("cost_per_session").notNull(),
  biweeklyPrice: numeric("biweekly_price").notNull(),
  pifPrice: numeric("pif_price").notNull(), // Paid in full price
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const gymMembershipPricing = pgTable("gym_membership_pricing", {
  id: serial("id").primaryKey(),
  gymName: text("gym_name").notNull(),
  luxeEssentialsPrice: numeric("luxe_essentials_price").notNull(),
  luxeStrivePrice: numeric("luxe_strive_price").notNull(),
  luxeAllAccessPrice: numeric("luxe_all_access_price").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
export const insertMemberSchema = createInsertSchema(members).omit({ createdAt: true });
export const insertMemberProfileSchema = createInsertSchema(memberProfiles)
  .extend({
    goals: z.array(z.string()).min(1, "At least one goal is required"),
    healthConditions: z.array(z.string()).optional(),
    height: z.string().min(1, "Height must not be empty"),
    weight: z.string().min(1, "Weight must not be empty"),
  });
export const insertMemberAssessmentSchema = createInsertSchema(memberAssessments)
  .extend({
    measurements: z.object({
      chest: z.number().optional(),
      waist: z.number().optional(),
      hips: z.number().optional(),
      thighs: z.number().optional(),
      arms: z.number().optional()
    })
  });
export const insertMemberProgressPhotoSchema = createInsertSchema(memberProgressPhotos);
export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans);
export const insertWorkoutLogSchema = createInsertSchema(workoutLogs);
export const insertScheduleSchema = createInsertSchema(schedules);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns);
export const insertMuscleGroupSchema = createInsertSchema(muscleGroups);
export const insertExerciseSchema = createInsertSchema(exercises)
  .extend({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    instructions: z.array(z.string()).min(1, "Must include at least one instruction"),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  });

export const insertPricingPlanSchema = createInsertSchema(pricingPlans)
  .extend({
    costPerSession: z.string().min(1, "Cost per session is required"),
    biweeklyPrice: z.string().min(1, "Bi-weekly price is required"),
    pifPrice: z.string().min(1, "PIF price is required"),
  })
  .omit({ createdAt: true, updatedAt: true });

export const insertGymMembershipPricingSchema = createInsertSchema(gymMembershipPricing)
  .extend({
    luxeEssentialsPrice: z.string().min(1, "Luxe Essentials price is required"),
    luxeStrivePrice: z.string().min(1, "Luxe Strive price is required"),
    luxeAllAccessPrice: z.string().min(1, "Luxe All-Access price is required"),
  })
  .omit({ createdAt: true, updatedAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type MemberProfile = typeof memberProfiles.$inferSelect;
export type InsertMemberProfile = z.infer<typeof insertMemberProfileSchema>;
export type MemberAssessment = typeof memberAssessments.$inferSelect;
export type InsertMemberAssessment = z.infer<typeof insertMemberAssessmentSchema>;
export type MemberProgressPhoto = typeof memberProgressPhotos.$inferSelect;
export type InsertMemberProgressPhoto = z.infer<typeof insertMemberProgressPhotoSchema>;
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
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type PricingPlan = typeof pricingPlans.$inferSelect;
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
export type GymMembershipPricing = typeof gymMembershipPricing.$inferSelect;
export type InsertGymMembershipPricing = z.infer<typeof insertGymMembershipPricingSchema>;