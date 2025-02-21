/*
Next Implementation Steps (2025-02-21):

1. Storage Interface Updates:
- Implement DatabaseStorage class with new entity methods for:
  - Member profiles
  - Assessments
  - Workout plans
  - Class scheduling
  - Meal plans
  - Progress tracking

2. Route Implementation:
- Add new API routes for:
  - Member management (/api/members/*)
  - Training management (/api/training/*)
  - Schedule management (/api/schedule/*)
  - Assessment tracking (/api/assessments/*)

3. Validation Layer:
- Implement request validation using Zod schemas
- Add middleware for role-based access control
- Enhance error handling for all new endpoints

4. Database Relations:
- Ensure proper implementation of all relations defined in schema
- Add indexes for frequent queries
- Implement proper cascade behavior for related entities

Current Progress:
- Base schema implemented with all required tables
- Initial database setup complete
- Types and insert schemas defined
*/

import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from 'drizzle-orm';

// Users table and relations
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

export const usersRelations = relations(users, ({ many }) => ({
  members: many(members),
  trainers: many(members, { relationName: "trainer" }),
  marketingCampaigns: many(marketingCampaigns),
  mealPlans: many(mealPlans)
}));

// Members table and relations
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assignedTrainerId: integer("assigned_trainer_id").references(() => users.id),
  membershipType: text("membership_type", {
    enum: ["luxe_essentials", "luxe_strive", "luxe_all_access", "training_only"]
  }).notNull(),
  membershipStatus: text("membership_status", {
    enum: ["active", "inactive", "suspended"]
  }).notNull(),
  gymLocationId: integer("gym_location_id").references(() => gymMembershipPricing.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
  return {
    memberStatusIdx: uniqueIndex("member_status_idx").on(table.membershipStatus),
    memberTypeIdx: uniqueIndex("member_type_idx").on(table.membershipType),
    memberDateIdx: uniqueIndex("member_date_idx").on(table.startDate, table.endDate),
    trainerMemberIdx: uniqueIndex("trainer_member_idx").on(table.assignedTrainerId)
  }
});

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  trainer: one(users, {
    fields: [members.assignedTrainerId],
    references: [users.id],
  }),
  profile: one(memberProfiles),
  assessments: many(memberAssessments),
  progressPhotos: many(memberProgressPhotos),
  workoutPlans: many(workoutPlans),
  workoutLogs: many(workoutLogs),
  schedules: many(schedules),
  invoices: many(invoices),
  memberMealPlans: many(memberMealPlans),
  gymLocation: one(gymMembershipPricing, {
    fields: [members.gymLocationId],
    references: [gymMembershipPricing.id],
  })
}));

export const memberProfiles = pgTable("member_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  // Personal Information
  birthDate: timestamp("birth_date"),
  gender: text("gender"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phoneNumber: text("phone_number"),
  // Physical Information
  height: text("height"),  // Store as text to handle various formats
  weight: text("weight"),  // Store as text to handle various formats
  // Goals and Health
  fitnessGoals: text("fitness_goals").array(),
  healthConditions: text("health_conditions").array(),
  medications: text("medications").array(),
  injuries: text("injuries").array(),
  // Emergency Contact
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  // Liability and Agreements
  liabilityWaiverSigned: boolean("liability_waiver_signed"),
  liabilityWaiverSignedDate: timestamp("liability_waiver_signed_date"),
  liabilityWaiverSignature: text("liability_waiver_signature"),
  photoReleaseWaiverSigned: boolean("photo_release_waiver_signed"),
  photoReleaseWaiverSignedDate: timestamp("photo_release_waiver_signed_date"),
  photoReleaseSignature: text("photo_release_signature"),
  // Preferences
  preferredContactMethod: text("preferred_contact_method", {
    enum: ["email", "phone", "text"]
  }),
  marketingOptIn: boolean("marketing_opt_in"),
  // Previous medical clearance
  hadPhysicalLastYear: boolean("had_physical_last_year"),
  physicianClearance: boolean("physician_clearance"),
  physicianName: text("physician_name"),
  physicianPhone: text("physician_phone"),
  // Timestamps
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
  trainerId: integer("trainer_id").references(() => users.id, { onDelete: 'set null' }),
  memberId: integer("member_id").references(() => members.id, { onDelete: 'cascade' }),
  status: text("status", { enum: ["active", "completed", "cancelled"] }).notNull(),
  frequencyPerWeek: integer("frequency_per_week").notNull(),
  completionRate: numeric("completion_rate").default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
  return {
    workoutPlanStatusIdx: uniqueIndex("workout_plan_status_idx").on(table.status),
    workoutPlanMemberIdx: uniqueIndex("workout_plan_member_idx").on(table.memberId)
  }
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
  trainerId: integer("trainer_id").references(() => users.id, { onDelete: 'cascade' }),
  memberId: integer("member_id").references(() => members.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull()
}, (table) => {
  return {
    scheduleTrainerDateIdx: uniqueIndex("schedule_trainer_date_idx").on(table.trainerId, table.date),
    scheduleMemberDateIdx: uniqueIndex("schedule_member_date_idx").on(table.memberId, table.date),
    scheduleStatusIdx: uniqueIndex("schedule_status_idx").on(table.status)
  }
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
  gymName: text("gym_name").notNull().unique(),
  luxeEssentialsPrice: numeric("luxe_essentials_price").notNull(),
  luxeStrivePrice: numeric("luxe_strive_price").notNull(),
  luxeAllAccessPrice: numeric("luxe_all_access_price").notNull(),
  isactive: boolean("isactive").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Update membership_pricing table definition to ensure safe creation
export const membershipPricing = pgTable("membership_pricing", {
  id: serial("id").primaryKey(),
  gymLocation: text("gym_location").notNull(),
  membershipTier1: numeric("membership_tier_1").notNull(),
  membershipTier2: numeric("membership_tier_2").notNull(),
  membershipTier3: numeric("membership_tier_3").notNull(),
  membershipTier4: numeric("membership_tier_4").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => {
  return {
    membershipLocationIdx: uniqueIndex("membership_location_idx").on(table.gymLocation),
    membershipActiveIdx: uniqueIndex("membership_active_idx").on(table.isActive)
  }
});

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  meals: jsonb("meals").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const memberMealPlans = pgTable("member_meal_plans", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id).notNull(),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  customMeals: jsonb("custom_meals"),
  status: text("status", {
    enum: ["pending", "active", "completed"]
  }).notNull(),
});

// Scheduled Blocks View
export const scheduledBlocks = pgTable("scheduled_blocks", {
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: text("type", { enum: ["session", "class"] }).notNull(),
  id: integer("id").notNull()
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  status: text("status", {
    enum: ["scheduled", "completed", "canceled"]
  }).notNull(),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  capacity: integer("capacity").notNull(),
  status: text("status", {
    enum: ["scheduled", "completed", "canceled"]
  }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const classRegistrations = pgTable("class_registrations", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  status: text("status", {
    enum: ["registered", "attended", "canceled"]
  }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Add relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  trainer: one(users, {
    fields: [sessions.trainerId],
    references: [users.id],
  }),
  member: one(members, {
    fields: [sessions.memberId],
    references: [members.id],
  })
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  trainer: one(users, {
    fields: [classes.trainerId],
    references: [users.id],
  }),
  registrations: many(classRegistrations)
}));

export const classRegistrationsRelations = relations(classRegistrations, ({ one }) => ({
  class: one(classes, {
    fields: [classRegistrations.classId],
    references: [classes.id],
  }),
  member: one(members, {
    fields: [classRegistrations.memberId],
    references: [members.id],
  })
}));

// Add insert schemas
export const insertMealPlanSchema = createInsertSchema(mealPlans)
  .extend({
    meals: z.array(z.object({
      meal: z.string(),
      food: z.string(),
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fats: z.number().optional()
    })).min(1, "At least one meal is required")
  });

export const insertMemberMealPlanSchema = createInsertSchema(memberMealPlans);

// Add types for meal plans and relations
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MemberMealPlan = typeof memberMealPlans.$inferSelect;
export type InsertMemberMealPlan = z.infer<typeof insertMemberMealPlanSchema>;

// Add relations for meal plans
export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  trainer: one(users, {
    fields: [mealPlans.trainerId],
    references: [users.id],
  }),
  memberMealPlans: many(memberMealPlans)
}));

export const memberMealPlansRelations = relations(memberMealPlans, ({ one }) => ({
  member: one(members, {
    fields: [memberMealPlans.memberId],
    references: [members.id],
  }),
  mealPlan: one(mealPlans, {
    fields: [memberMealPlans.mealPlanId],
    references: [mealPlans.id],
  })
}));


export const validateSchedulingConflict = async (
  db: any,
  trainerId: number,
  date: Date,
  startTime: string,
  duration: number
): Promise<{ hasConflict: boolean; error?: string }> => {
  try {
    const [conflict] = await db.execute(sql`
      WITH new_slot AS (
        SELECT 
          ${trainerId} as trainer_id,
          ${date}::date as date,
          (${date}::date + ${startTime}::time)::timestamp as start_timestamp,
          (${date}::date + ${startTime}::time + interval '${duration} minutes')::timestamp as end_timestamp
      ),
      existing_blocks AS (
        SELECT 
          trainer_id,
          date,
          (date + start_time::time)::timestamp as start_timestamp,
          end_time as end_timestamp
        FROM scheduled_blocks
        WHERE trainer_id = ${trainerId}
        AND date::date = ${date}::date
      )
      SELECT EXISTS (
        SELECT 1 FROM existing_blocks eb, new_slot ns
        WHERE eb.trainer_id = ns.trainer_id
        AND eb.date::date = ns.date::date
        AND (
          (eb.start_timestamp <= ns.start_timestamp AND eb.end_timestamp > ns.start_timestamp)
          OR 
          (eb.start_timestamp < ns.end_timestamp AND eb.end_timestamp >= ns.end_timestamp)
          OR
          (ns.start_timestamp <= eb.start_timestamp AND ns.end_timestamp > eb.start_timestamp)
        )
      ) as has_conflict;
    `);

    return {
      hasConflict: conflict?.has_conflict || false
    };
  } catch (error) {
    return {
      hasConflict: false,
      error: `Failed to validate scheduling: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const insertSessionSchema = createInsertSchema(sessions)
  .extend({
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    duration: z.number().min(15, "Session must be at least 15 minutes").max(180, "Session cannot exceed 3 hours"),
  })
  .omit({ createdAt: true, deletedAt: true });

export const insertClassSchema = createInsertSchema(classes)
  .extend({
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    duration: z.number().min(15, "Class must be at least 15 minutes").max(180, "Class cannot exceed 3 hours"),
    capacity: z.number().min(1, "Class must have at least 1 spot"),
  })
  .omit({ createdAt: true });

export const insertClassRegistrationSchema = createInsertSchema(classRegistrations).omit({ createdAt: true });

// Add types
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
export type MembershipPricing = typeof membershipPricing.$inferSelect;
export type InsertMembershipPricing = z.infer<typeof insertMembershipPricingSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ClassRegistration = typeof classRegistrations.$inferSelect;
export type InsertClassRegistration = z.infer<typeof insertClassRegistrationSchema>;


export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
export const insertMemberSchema = createInsertSchema(members)
  .extend({
    membershipType: z.enum(["luxe_essentials", "luxe_strive", "luxe_all_access", "training_only"]),
    gymLocationId: z.number(),
  })
  .omit({ createdAt: true });
export const insertMemberProfileSchema = createInsertSchema(memberProfiles)
  .extend({
    fitnessGoals: z.array(z.string()).min(1, "At least one goal is required"),
    healthConditions: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    injuries: z.array(z.string()).optional(),
    height: z.string().min(1, "Height must not be empty"),
    weight: z.string().min(1, "Weight must not be empty"),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    zipCode: z.string().min(5, "Zip code must be at least 5 digits"),
    preferredContactMethod: z.enum(["email", "phone", "text"]),
  })
  .omit({ createdAt: true, updatedAt: true });
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
    gymName: z.string().min(1, "Gym name is required"),
    luxeEssentialsPrice: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
    luxeStrivePrice: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
    luxeAllAccessPrice: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
  })
  .omit({ createdAt: true, updatedAt: true });

export const insertMembershipPricingSchema = createInsertSchema(membershipPricing)
  .extend({
    gymLocation: z.string().min(1, "Gym location is required"),
    membershipTier1: z.number().min(0, "Price must be positive"),
    membershipTier2: z.number().min(0, "Price must be positive"),
    membershipTier3: z.number().min(0, "Price must be positive"),
    membershipTier4: z.number().min(0, "Price must be positive"),
  })
  .omit({ id: true, createdAt: true, updatedAt: true, isActive: true });

export const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
  trainer: one(users, {
    fields: [workoutPlans.trainerId],
    references: [users.id],
  }),
  member: one(members, {
    fields: [workoutPlans.memberId],
    references: [members.id],
  }),
  workoutLogs: many(workoutLogs)
}));

// Add relations for membership_pricing
export const membershipPricingRelations = relations(membershipPricing, ({ many }) => ({
  members: many(members)
}));