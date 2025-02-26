import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from 'drizzle-orm';
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

// =====================
// Base Schemas
// =====================

export const macroDistributionSchema = z.object({
  protein: z.number().min(0).max(100),
  carbs: z.number().min(0).max(100),
  fats: z.number().min(0).max(100)
}).refine(data => {
  return data.protein + data.carbs + data.fats === 100;
}, "Macro distribution must total 100%");

export const mealItemSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  ingredients: z.array(z.object({
    item: z.string(),
    amount: z.string(),
    unit: z.string()
  })),
  instructions: z.array(z.string()),
  prepTime: z.number().min(0),
  cookingDifficulty: z.enum(["beginner", "intermediate", "advanced"]),
  weekNumber: z.number().min(1).max(2),
  dayNumber: z.number().min(1).max(7),
  mealNumber: z.number().min(1).max(6),
  isCustomized: z.boolean().default(false),
  replacementForId: z.number().optional()
});

export const aiMealPlanSchema = z.object({
  foodPreferences: z.string().max(1000),
  calorieTarget: z.number().min(500).max(10000),
  mealsPerDay: z.number().min(1).max(6),
  dietaryRestrictions: z.array(z.string()).optional(),
  fitnessGoals: z.array(z.string()).optional(),
  macroDistribution: macroDistributionSchema,
  cookingSkillLevel: z.enum(["beginner", "intermediate", "advanced"]),
  maxPrepTime: z.string(),
  planDuration: z.number().min(1).max(14).default(14)
});

// =====================
// Type Exports
// =====================

// Schema Types
export type MealItem = z.infer<typeof mealItemSchema>;
export type AiMealPlan = z.infer<typeof aiMealPlanSchema>;
export type MacroDistribution = z.infer<typeof macroDistributionSchema>;

// Database Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;

// =====================
// Table Definitions
// =====================

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  targetCalories: integer("target_calories").notNull(),
  macroDistribution: jsonb("macro_distribution").notNull(),
  dietaryPreferences: text("dietary_preferences").array(),
  dietaryRestrictions: text("dietary_restrictions").array(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status", {
    enum: ["draft", "active", "completed", "archived"]
  }).notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  calories: integer("calories").notNull(),
  protein: numeric("protein").notNull(),
  carbs: numeric("carbs").notNull(),
  fats: numeric("fats").notNull(),
  ingredients: jsonb("ingredients").notNull(),
  instructions: text("instructions").array().notNull(),
  prepTime: integer("prep_time").notNull(),
  cookingDifficulty: text("cooking_difficulty", {
    enum: ["beginner", "intermediate", "advanced"]
  }).notNull(),
  weekNumber: integer("week_number").notNull(),
  dayNumber: integer("day_number").notNull(),
  mealNumber: integer("meal_number").notNull(),
  isCustomized: boolean("is_customized").default(false),
  replacementForId: integer("replacement_for_id").references(() => meals.id),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

const users = pgTable("users", {
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

const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assignedTrainerId: integer("assigned_trainer_id").references(() => users.id),
  membershipType: text("membership_type", {
    enum: ["luxe_essentials", "luxe_strive", "luxe_all_access", "training_only"]
  }).notNull(),
  membershipStatus: text("membership_status", {
    enum: ["active", "inactive", "suspended"]
  }).notNull(),
  gymLocationId: integer("gym_location_id").references(() => gymMembershipPricing.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
  return {
    memberStatusIdx: uniqueIndex("member_status_idx").on(table.membershipStatus),
    memberTypeIdx: uniqueIndex("member_type_idx").on(table.membershipType),
    memberDateIdx: uniqueIndex("member_date_idx").on(table.startDate, table.endDate),
    trainerMemberIdx: uniqueIndex("trainer_member_idx").on(table.assignedTrainerId),
    activeUserIdx: uniqueIndex("active_user_idx")
      .on(table.userId)
      .where(sql`membership_status = 'active'`)
  }
});

const movementPatterns = pgTable("movement_patterns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type", {
    enum: ["compound", "isolation", "plyometric", "bodyweight"]
  }).notNull()
});

const trainingPackages = pgTable("training_packages", {
  id: serial("id").primaryKey(),
  sessionDuration: integer("session_duration").notNull(),
  sessionsPerWeek: integer("sessions_per_week").notNull(),
  costPerSession: numeric("cost_per_session").notNull(),
  costBiWeekly: numeric("cost_bi_weekly").notNull(),
  pifAmount: numeric("pif_amount").notNull(),
  additionalBenefits: text("additional_benefits").array(),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

const trainingClients = pgTable("training_clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assignedTrainerId: integer("assigned_trainer_id").references(() => users.id),
  clientStatus: text("client_status", {
    enum: ["active", "inactive", "on_hold"]
  }).notNull(),
  startDate: timestamp("start_date").notNull(),
  packageType: text("package_type").notNull(),
  sessionsRemaining: integer("sessions_remaining"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

const memberProfiles = pgTable("member_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  birthDate: timestamp("birth_date"),
  gender: text("gender"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phoneNumber: text("phone_number"),
  height: text("height"),
  weight: text("weight"),
  fitnessGoals: text("fitness_goals").array(),
  healthConditions: text("health_conditions").array(),
  medications: text("medications").array(),
  injuries: text("injuries").array(),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  liabilityWaiverSigned: boolean("liability_waiver_signed"),
  liabilityWaiverSignedDate: timestamp("liability_waiver_signed_date"),
  liabilityWaiverSignature: text("liability_waiver_signature"),
  photoReleaseWaiverSigned: boolean("photo_release_waiver_signed"),
  photoReleaseWaiverSignedDate: timestamp("photo_release_waiver_signed_date"),
  photoReleaseSignature: text("photo_release_signature"),
  preferredContactMethod: text("preferred_contact_method", {
    enum: ["email", "phone", "text"]
  }),
  marketingOptIn: boolean("marketing_opt_in"),
  hadPhysicalLastYear: boolean("had_physical_last_year"),
  physicianClearance: boolean("physician_clearance"),
  physicianName: text("physician_name"),
  physicianPhone: text("physician_phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

const memberAssessments = pgTable("member_assessments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  assessmentDate: timestamp("assessment_date").notNull(),
  weight: numeric("weight"),
  bodyFatPercentage: numeric("body_fat_percentage"),
  measurements: jsonb("measurements").notNull(),
  notes: text("notes"),
  trainerId: integer("trainer_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

const memberProgressPhotos = pgTable("member_progress_photos", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  photoUrl: text("photo_url").notNull(),
  photoDate: timestamp("photo_date").notNull(),
  category: text("category", { enum: ["front", "back", "side"] }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

const workoutPlans = pgTable("workout_plans", {
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

const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  workoutPlanId: integer("workout_plan_id").references(() => workoutPlans.id).notNull(),
  completedAt: timestamp("completed_at").notNull(),
  duration: integer("duration").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id, { onDelete: 'cascade' }),
  memberId: integer("member_id").references(() => members.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull()
}, (table) => {
  return {
    trainerScheduleConstraint: sql`CONSTRAINT trainer_schedule_overlap
      EXCLUDE USING gist (
        trainer_id WITH =,
        tsrange(date, date + interval '1 hour') WITH &&
      ) WHERE (status = 'scheduled')`,
    memberScheduleConstraint: sql`CONSTRAINT member_schedule_overlap
      EXCLUDE USING gist (
        member_id WITH =,
        tsrange(date, date + interval '1 hour') WITH &&
      ) WHERE (status = 'scheduled')`,
    scheduleStatusIdx: uniqueIndex("schedule_status_idx").on(table.status)
  }
});

const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  amount: numeric("amount").notNull(),
  status: text("status", { enum: ["pending", "paid", "cancelled"] }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

const marketingCampaigns = pgTable("marketing_campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetAudience: text("target_audience", { enum: ["all", "active", "inactive"] }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status", { enum: ["draft", "active", "completed"] }).notNull(),
  createdBy: integer("created_by").references(() => users.id)
});

const muscleGroups = pgTable("muscle_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  bodyRegion: text("body_region", { enum: ["upper", "lower", "core"] }).notNull()
});

const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  difficulty: text("difficulty", {
    enum: ["beginner", "intermediate", "advanced"]
  }).notNull(),
  primaryMuscleGroupId: integer("primary_muscle_group_id").references(() => muscleGroups.id).notNull(),
  secondaryMuscleGroupIds: integer("secondary_muscle_group_ids").array().notNull(),
  instructions: text("instructions").array().notNull(),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

const pricingPlans = pgTable("pricing_plans", {
  id: serial("id").primaryKey(),
  sessionsPerWeek: integer("sessions_per_week").notNull(),
  duration: integer("duration").notNull(),
  costPerSession: numeric("cost_per_session").notNull(),
  biweeklyPrice: numeric("biweekly_price").notNull(),
  pifPrice: numeric("pif_price").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

const gymMembershipPricing = pgTable("gym_membership_pricing", {
  id: serial("id").primaryKey(),
  gymName: text("gym_name").notNull().unique(),
  luxeEssentialsPrice: numeric("luxe_essentials_price").notNull(),
  luxeStrivePrice: numeric("luxe_strive_price").notNull(),
  luxeAllAccessPrice: numeric("luxe_all_access_price").notNull(),
  isactive: boolean("isactive").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

const membershipPricing = pgTable("membership_pricing", {
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

const memberMealPlans = pgTable("member_meal_plans", {
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

const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  duration: integer("duration").notNull(),
  status: text("status", {
    enum: ["scheduled", "completed", "canceled"]
  }).notNull(),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
  return {
    timeFormatCheck: sql`CONSTRAINT sessions_time_format_check CHECK (
      time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
    )`,
    sessionOverlapCheck: sql`CONSTRAINT session_overlap_exclusion
      EXCLUDE USING gist (
        trainer_id WITH =,
        tsrange(
          date + time::time,
          date + time::time + (duration || ' minutes')::interval
        ) WITH &&
      ) WHERE (status = 'scheduled' AND deleted_at IS NULL)`
  }
});

const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  duration: integer("duration").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status", {
    enum: ["scheduled", "completed", "canceled"]
  }).notNull(),
  templateId: integer("template_id").references(() => classTemplates.id),
  currentCapacity: integer("current_capacity").notNull().default(0),
  waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
  waitlistCapacity: integer("waitlist_capacity").notNull().default(5),
  cancelationDeadline: timestamp("cancelation_deadline"),
  recurring: boolean("recurring").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
  return {
    timeFormatCheck: sql`CONSTRAINT classes_time_format_check CHECK (
      time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
    )`,
    classOverlapCheck: sql`CONSTRAINT class_overlap_exclusion
      EXCLUDE USING gist (
        trainer_id WITH =,
        tsrange(
          date + time::time,
          date + time::time + (duration || ' minutes')::interval
        ) WITH &&
      ) WHERE (status = 'scheduled')`
  }
});

const createScheduledBlocksView = sql`
  CREATE OR REPLACE VIEW scheduled_blocks_view AS
  SELECT 
    trainer_id,
    date,
    time,
    (date + time::time + (duration || ' minutes')::interval) as end_time,
    'session' as type,
    id
  FROM sessions 
  WHERE status = 'scheduled' AND deleted_at IS NULL
  UNION ALL
  SELECT 
    trainer_id,
    date,
    time,
    (date + time::time + (duration || ' minutes')::interval) as end_time,
    'class' as type,
    id
  FROM classes 
  WHERE status = 'scheduled'
`;

const classRegistrations = pgTable("class_registrations", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  status: text("status", {
    enum: ["registered", "attended", "canceled"]
  }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

const classTemplates = pgTable("class_templates", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  capacity: integer("capacity").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
  return {
    timeFormatCheck: sql`CONSTRAINT class_templates_time_format_check CHECK (
      start_time ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
    )`
  }
});

const classWaitlist = pgTable("class_waitlist", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  position: integer("position").notNull(),
  status: text("status", {
    enum: ["waiting", "notified", "expired"]
  }).notNull().default("waiting"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
  return {
    classWaitlistIdx: uniqueIndex("class_waitlist_idx").on(table.classId, table.memberId),
    waitlistPositionIdx: uniqueIndex("waitlist_position_idx").on(table.classId, table.position)
  }
});

const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id, { onDelete: 'cascade' }).notNull(),
  progressDate: timestamp("progress_date").notNull().defaultNow(),
  weight: numeric("weight"),
  bodyFatPercentage: numeric("body_fat_percentage"),
  measurements: jsonb("measurements").notNull().default(sql`'{}'::jsonb`),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => {
  return {
    memberProgressIdx: uniqueIndex("member_progress_idx").on(table.memberId, table.progressDate),
    progressDateIdx: uniqueIndex("progress_date_idx").on(table.progressDate)
  }
});

const strengthMetrics = pgTable("strength_metrics", {
  id: serial("id").primaryKey(),
  progressId: integer("progress_id").references(() => progress.id, { onDelete: 'cascade' }).notNull(),
  exerciseId: integer("exercise_id").references(() => exercises.id, { onDelete: 'restrict' }).notNull(),
  weightAmount: numeric("weight_amount"),
  numberOfSets: integer("number_of_sets").notNull(),
  numberOfReps: integer("number_of_reps").notNull(),
  exerciseNotes: text("exercise_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
  return {
    progressExerciseIdx: uniqueIndex("progress_exercise_idx").on(table.progressId, table.exerciseId),
    strengthMetricsDateIdx: uniqueIndex("strength_metrics_date_idx").on(table.createdAt)
  }
});

const temporaryMealPlans = pgTable("temporary_meal_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  meals: jsonb("meals").notNull(),
  macroDistribution: jsonb("macro_distribution").notNull(),
  targetCalories: integer("target_calories").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// =====================
// Relations Definitions
// =====================

export const usersRelations = relations(users, ({ many }) => ({
  members: many(members),
  trainers: many(members, { relationName: "trainer" }),
  marketingCampaigns: many(marketingCampaigns),
  mealPlans: many(mealPlans)
}));

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

const movementPatternsRelations = relations(movementPatterns, ({ many }) => ({
  exercises: many(exercises)
}));

const trainingPackagesRelations = relations(trainingPackages, ({ many }) => ({
  trainingClients: many(trainingClients)
}));

const trainingClientsRelations = relations(trainingClients, ({ one }) => ({
  user: one(users, {
    fields: [trainingClients.userId],
    references: [users.id],
  }),
  trainer: one(users, {
    fields: [trainingClients.assignedTrainerId],
    references: [users.id],
  }),
  package: one(trainingPackages, {
    fields: [trainingClients.packageType],
    references: [trainingPackages.id],
  })
}));

const memberProfilesRelations = relations(memberProfiles, ({ one }) => ({
  user: one(users, {
    fields: [memberProfiles.userId],
    references: [users.id]
  })
}));

const memberAssessmentsRelations = relations(memberAssessments, ({ one }) => ({
  member: one(members, {
    fields: [memberAssessments.memberId],
    references: [members.id]
  }),
  trainer: one(users, {
    fields: [memberAssessments.trainerId],
    references: [users.id]
  })
}));

const memberProgressPhotosRelations = relations(memberProgressPhotos, ({ one }) => ({
  member: one(members, {
    fields: [memberProgressPhotos.memberId],
    references: [members.id]
  })
}));

const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
  trainer: one(users, {
    fields: [workoutPlans.trainerId],
    references: [users.id]
  }),
  member: one(members, {
    fields: [workoutPlans.memberId],
    references: [members.id]
  }),
  workoutLogs: many(workoutLogs)
}));

const workoutLogsRelations = relations(workoutLogs, ({ one }) => ({
  member: one(members, {
    fields: [workoutLogs.memberId],
    references: [members.id]
  }),
  workoutPlan: one(workoutPlans, {
    fields: [workoutLogs.workoutPlanId],
    references: [workoutPlans.id]
  })
}));

const schedulesRelations = relations(schedules, ({ one }) => ({
  trainer: one(users, {
    fields: [schedules.trainerId],
    references: [users.id]
  }),
  member: one(members, {
    fields: [schedules.memberId],
    references: [members.id]
  })
}));

const invoicesRelations = relations(invoices, ({ one }) => ({
  member: one(members, {
    fields: [invoices.memberId],
    references: [members.id]
  })
}));

const exercisesRelations = relations(exercises, ({ one, many }) => ({
  primaryMuscleGroup: one(muscleGroups, {
    fields: [exercises.primaryMuscleGroupId],
    references: [muscleGroups.id],
  }),
  strengthMetrics: many(strengthMetrics)
}));

const pricingPlansRelations = relations(pricingPlans, ({ many }) => ({}));

const gymMembershipPricingRelations = relations(gymMembershipPricing, ({ many }) => ({
  members: many(members)
}));

const membershipPricingRelations = relations(membershipPricing, ({ many }) => ({
  members: many(members)
}));

export const mealPlanRelations = relations(mealPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [mealPlans.userId],
    references: [users.id]
  }),
  meals: many(meals)
}));

export const mealRelations = relations(meals, ({ one }) => ({
  replacedMeal: one(meals, {
    fields: [meals.replacementForId],
    references: [meals.id]
  }),
  mealPlan: one(mealPlans, {
    fields: [meals.mealPlanId],
    references: [mealPlans.id]
  })
}));

const memberMealPlansRelations = relations(memberMealPlans, ({ one }) => ({
  member: one(members, {
    fields: [memberMealPlans.memberId],
    references: [members.id]
  }),
  mealPlan: one(mealPlans, {
    fields: [memberMealPlans.mealPlanId],
    references: [mealPlans.id]
  })
}));

const sessionsRelations = relations(sessions, ({ one }) => ({
  trainer: one(users, {
    fields: [sessions.trainerId],
    references: [users.id],
  }),
  member: one(members, {
    fields: [sessions.memberId],
    references: [members.id],
  })
}));

const classesRelations = relations(classes, ({ one, many }) => ({
  trainer: one(users, {
    fields: [classes.trainerId],
    references: [users.id],
  }),
  template: one(classTemplates, {
    fields: [classes.templateId],
    references: [classTemplates.id],
  }),
  registrations: many(classRegistrations),
  waitlist: many(classWaitlist)
}));

const classRegistrationsRelations = relations(classRegistrations, ({ one }) => ({
  class: one(classes, {
    fields: [classRegistrations.classId],
    references: [classes.id],
  }),
  member: one(members, {
    fields: [classRegistrations.memberId],
    references: [members.id],
  })
}));

const classTemplatesRelations = relations(classTemplates, ({ many }) => ({
  classes: many(classes)
}));

const classWaitlistRelations = relations(classWaitlist, ({ one }) => ({
  class: one(classes, {
    fields: [classWaitlist.classId],
    references: [classes.id]
  }),
  member: one(members, {
    fields: [classWaitlist.memberId],
    references: [members.id]
  })
}));

const progressRelations = relations(progress, ({ one, many }) => ({
  member: one(members, {
    fields: [progress.memberId],
    references: [members.id]
  }),
  strengthMetrics: many(strengthMetrics)
}));

const strengthMetricsRelations = relations(strengthMetrics, ({ one }) => ({
  progress: one(progress, {
    fields: [strengthMetrics.progressId],
    references: [progress.id]
  }),
  exercise: one(exercises, {
    fields: [strengthMetrics.exerciseId],
    references: [exercises.id]
  })
}));


// =====================
// Insert Schemas
// =====================

export const insertUserSchema = createInsertSchema(users)
  .extend({
    role: z.enum(["admin", "trainer", "user"]).default("user"),
    email: z.string().email("Invalid email format"),
    name: z.string().min(1, "Name is required"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .omit({
    createdAt: true,
  });

export const insertMealSchema = createInsertSchema(meals)
  .extend({
    cookingDifficulty: z.enum(["beginner", "intermediate", "advanced"]),
    ingredients: z.array(z.object({
      item: z.string(),
      amount: z.string(),
      unit: z.string()
    })),
    instructions: z.array(z.string()).min(1, "Instructions are required"),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertMealPlanSchema = createInsertSchema(mealPlans)
  .extend({
    userId: z.number(),
    targetCalories: z.number().min(500).max(10000),
    macroDistribution: macroDistributionSchema,
    status: z.enum(["draft", "active", "completed", "archived"]).default("draft"),
    dietaryPreferences: z.array(z.string()).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

const insertGymMembershipPricingSchema = createInsertSchema(gymMembershipPricing)
  .extend({
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
  .omit({
    createdAt: true,
    updatedAt: true,
  });

const insertExerciseSchema = createInsertSchema(exercises)
  .extend({
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    primaryMuscleGroupId: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    secondaryMuscleGroupIds: z.array(z.number().or(z.string())).transform(val =>
      val.map(id => typeof id === 'string' ? parseInt(id) : id)
    ),
    instructions: z.array(z.string()).min(1, "Instructions are required"),
    videoUrl: z.string().optional().nullable()
  })
  .omit({ id: true, createdAt: true });

const insertInvoiceSchema = createInsertSchema(invoices)
  .extend({
    amount: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
    memberId: z.string().transform(val => parseInt(val)).optional(),
    status: z.enum(["pending", "paid", "cancelled"]).default("pending"),
    dueDate: z.coerce.date(),
    description: z.string().min(1, "Description is required"),
  })
  .omit({
    createdAt: true,
  });

const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns)
  .extend({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    createdBy: z.string().transform(val => parseInt(val)).optional(),
    status: z.enum(["draft", "active", "completed"]).default("draft"),
    targetAudience: z.enum(["all", "active", "inactive"]).default("all")
  })
  .omit({
    id: true
  });

const insertMealPlanSchema2 = createInsertSchema(mealPlans)
  .extend({
    userId: z.string().transform(val => parseInt(val)),
    targetCalories: z.number().min(500).max(10000),
    macroDistribution: z.object({
      protein: z.number().min(0).max(100),
      carbs: z.number().min(0).max(100),
      fats: z.number().min(0).max(100),
    }).refine(data => {
      const total = data.protein + data.carbs + data.fats;
      return total === 100;
    }, "Macro distribution must total 100%"),
    status: z.enum(["draft", "active", "completed", "archived"]).default("draft"),
    dietaryPreferences: z.array(z.string()).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    weekType: z.enum(["current", "upcoming"])
  })
  .omit({
    createdAt: true,
  });

const insertMemberAssessmentSchema = createInsertSchema(memberAssessments)
  .extend({
    memberId: z.string().transform(val => parseInt(val)),
    trainerId: z.string().transform(val => parseInt(val)).optional(),
    assessmentDate: z.coerce.date(),
    weight: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ).optional(),
    bodyFatPercentage: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ).optional(),
    measurements: z.record(z.unknown()).or(z.string()).transform(val =>
      typeof val === 'string' ? JSON.parse(val) : val
    ),
  })
  .omit({
    createdAt: true,
  });

const insertMemberProgressPhotoSchema = createInsertSchema(memberProgressPhotos)
  .extend({
    memberId: z.string().transform(val => parseInt(val)),
    photoUrl: z.string().url("Invalid photo URL"),
    photoDate: z.coerce.date(),
    category: z.enum(["front", "back", "side"]),
    notes: z.string().optional(),
  })
  .omit({
    createdAt: true,
  });

const insertMemberSchema = createInsertSchema(members)
  .extend({
    userId: z.string().transform(val => parseInt(val)),
    assignedTrainerId: z.string().transform(val => parseInt(val)).optional(),
    membershipType: z.enum(["luxe_essentials", "luxe_strive", "luxe_all_access", "training_only"]),
    membershipStatus: z.enum(["active", "inactive", "suspended"]),
    gymLocationId: z.string().transform(val => parseInt(val)).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
  })
  .omit({
    createdAt: true,
  });

const insertMuscleGroupSchema = createInsertSchema(muscleGroups)
  .extend({
    bodyRegion: z.enum(["upper", "lower", "core"]),
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
  })
  .omit({ id: true });

const insertMovementPatternSchema = createInsertSchema(movementPatterns)
  .extend({
    type: z.enum(["compound", "isolation", "plyometric", "bodyweight"])
  });

const insertPricingPlanSchema = createInsertSchema(pricingPlans)
  .extend({
    sessionsPerWeek: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    duration: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    costPerSession: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
    biweeklyPrice: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
    pifPrice: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
  })
  .omit({
    createdAt: true,
    updatedAt: true,
  });

const insertProgressSchema = createInsertSchema(progress)
  .extend({
    memberId: z.string().transform(val => parseInt(val)),
    progressDate: z.coerce.date(),
    weight: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ).optional(),
    bodyFatPercentage: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ).optional(),
    measurements: z.record(z.unknown()).or(z.string()).transform(val =>
      typeof val === 'string' ? JSON.parse(val) : val
    ),
  })
  .omit({
    updatedAt: true,
  });

const insertScheduleSchema = createInsertSchema(schedules)
  .extend({
    trainerId: z.string().transform(val => parseInt(val)),
    memberId: z.string().transform(val => parseInt(val)),
    date: z.coerce.date(),
    status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
  })
  .omit({ id: true });

const insertStrengthMetricSchema = createInsertSchema(strengthMetrics)
  .extend({
    progressId: z.string().transform(val => parseInt(val)),
    exerciseId: z.string().transform(val => parseInt(val)),
    weightAmount: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ).optional(),
    numberOfSets: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    numberOfReps: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
  })
  .omit({
    createdAt: true,
  });

const insertTrainingClientSchema = createInsertSchema(trainingClients)
  .extend({
    clientStatus: z.enum(["active", "inactive", "on_hold"]),
    packageType: z.string(),
    sessionsRemaining: z.number().min(0).optional()
  })
  .omit({ id: true, createdAt: true });

const insertTrainingPackageSchema = createInsertSchema(trainingPackages)
  .extend({
    sessionDuration: z.number().min(30).max(120),
    sessionsPerWeek: z.number().min(1).max(7),
    costPerSession: z.number().min(0),
    costBiWeekly: z.number().min(0),
    pifAmount: z.number().min(0),
    additionalBenefits: z.array(z.string()).optional()
  })
  .omit({ id: true, createdAt: true, updatedAt: true });

const insertWorkoutLogSchema = createInsertSchema(workoutLogs)
  .extend({
    memberId: z.string().transform(val => parseInt(val)),
    workoutPlanId: z.string().transform(val => parseInt(val)),
    completedAt: z.coerce.date(),
    duration: z.number().min(1),
  })
  .omit({ createdAt: true });

const insertWorkoutPlanSchema = createInsertSchema(workoutPlans)
  .extend({
    trainerId: z.string().transform(val => parseInt(val)).optional(),
    memberId: z.string().transform(val => parseInt(val)),
    status: z.enum(["active", "completed", "cancelled"]).default("active"),
    frequencyPerWeek: z.number().min(1).max(7),
    completionRate: z.number().min(0).max(100).optional()
  })
  .omit({ createdAt: true });

const insertClassSchema = createInsertSchema(classes)
  .extend({
    trainerId: z.string().transform(val => parseInt(val)),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    date: z.coerce.date(),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    duration: z.number().min(1),
    capacity: z.number().min(1),
    status: z.enum(["scheduled", "completed", "canceled"]).default("scheduled"),
    templateId: z.string().transform(val => parseInt(val)).optional(),
    currentCapacity: z.number().min(0),
    waitlistEnabled: z.boolean(),
    waitlistCapacity: z.number().min(0),
    cancelationDeadline: z.coerce.date().optional(),
    recurring: z.boolean()
  })
  .omit({ id: true, createdAt: true });

const insertClassTemplateSchema = createInsertSchema(classTemplates)
  .extend({
    trainerId: z.string().transform(val => parseInt(val)),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    duration: z.number().min(1),
    capacity: z.number().min(1),
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    isActive: z.boolean()
  })
  .omit({ id: true, createdAt: true });

const insertClassRegistrationSchema = createInsertSchema(classRegistrations)
  .extend({
    classId: z.string().transform(val => parseInt(val)),
    memberId: z.string().transform(val => parseInt(val)),
    status: z.enum(["registered", "attended", "canceled"]).default("registered")
  })
  .omit({ id: true, createdAt: true });

const insertClassWaitlistSchema = createInsertSchema(classWaitlist)
  .extend({
    classId: z.string().transform(val => parseInt(val)),
    memberId: z.string().transform(val => parseInt(val)),
    position: z.number().min(1),
    status: z.enum(["waiting", "notified", "expired"]).default("waiting")
  })
  .omit({ id: true, createdAt: true });

export const insertTemporaryMealPlanSchema = createInsertSchema(temporaryMealPlans)
  .extend({
    userId: z.number(),
    meals: z.array(mealItemSchema),
    macroDistribution: z.object({
      protein: z.number().min(0).max(100),
      carbs: z.number().min(0).max(100),
      fats: z.number().min(0).max(100),
    }).refine(data => {
      return data.protein + data.carbs + data.fats === 100;
    }, "Macro distribution must total 100%"),
    targetCalories: z.number().min(500).max(10000),
    expiresAt: z.coerce.date()
  })
  .omit({
    id: true,
    createdAt: true
  });

const insertMemberMealPlanSchema = createInsertSchema(memberMealPlans)
  .extend({
    memberId: z.string().transform(val => parseInt(val)),
    mealPlanId: z.string().transform(val => parseInt(val)),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["pending", "active", "completed"]).default("pending"),
    customMeals: z.record(z.unknown()).optional(),
  })
  .omit({
    assignedAt: true,
  });

// =====================
// Type Definitions
// =====================

export type User = typeof users.$inferSelect;
export type Member = typeof members.$inferSelect;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type MuscleGroup = typeof muscleGroups.$inferSelect;
export type PricingPlan = typeof pricingPlans.$inferSelect;
export type GymMembershipPricing = typeof gymMembershipPricing.$inferSelect;
export type MembershipPricing = typeof membershipPricing.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type MemberMealPlan = typeof memberMealPlans.$inferSelect;
export type Progress = typeof progress.$inferSelect;
export type StrengthMetric = typeof strengthMetrics.$inferSelect;
export type MovementPattern = typeof movementPatterns.$inferSelect;
export type TrainingPackage = typeof trainingPackages.$inferSelect;
export type TrainingClient = typeof trainingClients.$inferSelect;
export type MemberProfile = typeof memberProfiles.$inferSelect;
export type MemberAssessment = typeof memberAssessments.$inferSelect;
export type MemberProgressPhoto = typeof memberProgressPhotos.$inferSelect;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type ClassRegistration = typeof classRegistrations.$inferSelect;
export type ClassTemplate = typeof classTemplates.$inferSelect;
export type ClassWaitlist = typeof classWaitlist.$inferSelect;
export type PaymentMethod = typeof payments.$inferSelect;
export type PaymentStatus = typeof payments.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;


export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertGymMembershipPricing = z.infer<typeof insertGymMembershipPricingSchema>;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema2>;
export type InsertMemberAssessment = z.infer<typeof insertMemberAssessmentSchema>;
export type InsertMemberProgressPhoto = z.infer<typeof insertMemberProgressPhotoSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type InsertMuscleGroup = z.infer<typeof insertMuscleGroupSchema>;
export type InsertMovementPattern = z.infer<typeof insertMovementPatternSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type InsertClassTemplate = z.infer<typeof insertClassTemplateSchema>;
export type InsertClassRegistration = z.infer<typeof insertClassRegistrationSchema>;
export type InsertClassWaitlist = z.infer<typeof insertClassWaitlistSchema>;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type InsertTrainingPackage = z.infer<typeof insertTrainingPackageSchema>;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type InsertStrengthMetric = z.infer<typeof insertStrengthMetricSchema>;
export type InsertMemberMealPlan = z.infer<typeof insertMemberMealPlanSchema>;
export type AiMealPlan = z.infer<typeof aiMealPlanSchema>;
export type MealItem = z.infer<typeof mealItemSchema>;
export type TemporaryMealPlan = z.infer<typeof temporaryMealPlanSchema>;
export type InsertTemporaryMealPlan = z.infer<typeof insertTemporaryMealPlanSchema>;
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;


// =====================
// Exports
// =====================

export {
  // Tables
  users,
  members,
  movementPatterns,
  trainingPackages,
  trainingClients,
  memberProfiles,
  memberAssessments,
  memberProgressPhotos,
  workoutPlans,
  workoutLogs,
  schedules,
  invoices,
  marketingCampaigns,
  muscleGroups,
  exercises,
  pricingPlans,
  gymMembershipPricing,
  membershipPricing,
  mealPlans,
  memberMealPlans,
  sessions,
  classes,
  classRegistrations,
  classTemplates,
  classWaitlist,
  progress,
  strengthMetrics,
  temporaryMealPlans,
  meals,

  // Relations
  usersRelations,
  membersRelations,
  movementPatternsRelations,
  trainingPackagesRelations,
  trainingClientsRelations,
  memberProfilesRelations,
  memberAssessmentsRelations,
  memberProgressPhotosRelations,
  workoutPlansRelations,
  workoutLogsRelations,
  schedulesRelations,
  invoicesRelations,
  exercisesRelations,
  pricingPlansRelations,
  gymMembershipPricingRelations,
  membershipPricingRelations,
  mealPlanRelations,
  mealRelations,
  memberMealPlansRelations,
  sessionsRelations,
  classesRelations,
  classRegistrationsRelations,
  classTemplatesRelations,
  classWaitlistRelations,
  progressRelations,
  strengthMetricsRelations,

  // Schemas
  mealItemSchema,
  aiMealPlanSchema,
  temporaryMealPlanSchema,
  insertUserSchema,
  insertGymMembershipPricingSchema,
  insertExerciseSchema,
  insertInvoiceSchema,
  insertMarketingCampaignSchema,
  insertMealPlanSchema2,
  insertMemberAssessmentSchema,
  insertMemberProgressPhotoSchema,
  insertMemberSchema,
  insertClassSchema,
  insertClassTemplateSchema,
  insertClassRegistrationSchema,
  insertWorkoutPlanSchema,
  insertWorkoutLogSchema,
  insertTrainingPackageSchema,
  insertProgressSchema,
  insertScheduleSchema,
  insertStrengthMetricSchema,
  insertMealSchema,
  insertMealPlanSchema,
  insertMemberMealPlanSchema,
  macroDistributionSchema
};

export type {
  User,
  Member,
  MovementPattern,
  TrainingPackage,
  TrainingClient,
  MemberProfile,
  MemberAssessment,
  MemberProgressPhoto,
  WorkoutPlan,
  WorkoutLog,
  Schedule,
  Invoice,
  MarketingCampaign,
  MuscleGroup,
  Exercise,
  PricingPlan,
  GymMembershipPricing,
  MembershipPricing,
  MealPlan,
  MemberMealPlan,
  Session,
  Class,
  ClassRegistration,
  ClassTemplate,
  ClassWaitlist,
  Progress,
  StrengthMetric,

  // Schema types
  MealItem,
  AiMealPlan,
  TemporaryMealPlan,
  InsertUser,
  InsertGymMembershipPricing,
  InsertExercise,
  InsertInvoice,
  InsertMarketingCampaign,
  InsertMealPlan,
  InsertMemberAssessment,
  InsertMemberProgressPhoto,
  InsertMember,
  InsertClass,
  InsertClassTemplate,
  InsertClassRegistration,
  InsertClassWaitlist,
  InsertWorkoutPlan,
  InsertWorkoutLog,
  InsertTrainingPackage,
  InsertProgress,
  InsertSchedule,
  InsertStrengthMetric,
  InsertMemberMealPlan,
  Meal,
  InsertMeal,
  macroDistributionSchema,
  MacroDistribution
};