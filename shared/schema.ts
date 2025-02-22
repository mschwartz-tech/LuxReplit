import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from 'drizzle-orm';

/*
Next Implementation Steps (2025-02-22):

1. Completed Steps:
- Base schema implemented with core entities (users, members, trainers)
- Progress tracking tables implemented with proper relations:
  * Progress table for tracking member metrics
  * Strength metrics table for exercise-specific progress
  * All necessary indices and constraints in place
  * Proper cascade rules for data integrity

2. Next Steps:
- Implement remaining schema components:
  * Class scheduling system
  * Attendance tracking
  * Equipment inventory management
  * Membership billing and invoicing
  * Notification preferences and history

3. API Implementation Required:
- Member management endpoints
- Progress tracking endpoints
- Class scheduling endpoints
- Billing and payment endpoints

4. Storage Interface Updates Needed:
- Implement DatabaseStorage class with new entity methods
- Add proper error handling and validation
- Implement caching strategy for frequently accessed data

Current Status:
- Core schema is stable and ready for API implementation
- Progress tracking tables are complete with proper relations
- Basic user authentication schema is in place
- Member profiles and assessments are properly structured

Testing Requirements:
- Add integration tests for database operations
- Verify cascade behavior for related entities
- Test concurrent access patterns
- Validate constraint enforcement
*/

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
    trainerMemberIdx: uniqueIndex("trainer_member_idx").on(table.assignedTrainerId),
    // Partial unique index to prevent multiple active memberships per user
    activeUserIdx: uniqueIndex("active_user_idx")
      .on(table.userId)
      .where(sql`membership_status = 'active'`)
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

// Update schedules table definition
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id, { onDelete: 'cascade' }),
  memberId: integer("member_id").references(() => members.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull()
}, (table) => {
  return {
    // Use GiST exclusion constraint for overlapping schedules
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

// Update sessions table with correct column names
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
}, (table) => {
  return {
    // Add time format check constraint
    timeFormatCheck: sql`CONSTRAINT sessions_time_format_check CHECK (
      time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
    )`,
    // Add exclusion constraint for overlapping sessions
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

// Update classes table with correct column names
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
  templateId: integer("template_id").references(() => classTemplates.id),
  currentCapacity: integer("current_capacity").notNull().default(0),
  waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
  waitlistCapacity: integer("waitlist_capacity").notNull().default(5),
  cancelationDeadline: timestamp("cancelation_deadline"),
  recurring: boolean("recurring").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
  return {
    // Add time format check constraint
    timeFormatCheck: sql`CONSTRAINT classes_time_format_check CHECK (
      time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
    )`,
    // Add exclusion constraint for overlapping classes
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

// Update the scheduled_blocks view creation SQL
export const createScheduledBlocksView = sql`
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

// Update the view structure for TypeScript type safety
export const scheduledBlocks = pgTable("scheduled_blocks_view", {
  trainerId: integer("trainer_id").notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: text("type", { enum: ["session", "class"] }).notNull(),
  id: integer("id").notNull()
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


export const classTemplates = pgTable("class_templates", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  capacity: integer("capacity").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
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

// Add check constraint for waitlist capacity
export const classWaitlist = pgTable("class_waitlist", {
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
  template: one(classTemplates, {
    fields: [classes.templateId],
    references: [classTemplates.id],
  }),
  registrations: many(classRegistrations),
  waitlist: many(classWaitlist)
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

// Add relations for schedules and exercises
export const schedulesRelations = relations(schedules, ({ one }) => ({
  trainer: one(users, {
    fields: [schedules.trainerId],
    references: [users.id],
  }),
  member: one(members, {
    fields: [schedules.memberId],
    references: [members.id],
  })
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  primaryMuscleGroup: one(muscleGroups, {
    fields: [exercises.primaryMuscleGroupId],
    references: [muscleGroups.id],
  }),
  // Add relation to strength metrics
  strengthMetrics: many(strengthMetrics)
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

// Update the validateSchedulingConflict function to use the view
export const validateSchedulingConflict = async (
  db: any,
  trainerId: number,
  date: Date,
  startTime: string,
  duration: number
): Promise<{ hasConflict: boolean; error?: string }> => {
  try {
    const [conflict] = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM scheduled_blocks_view
        WHERE trainer_id = ${trainerId}
        AND date::date = ${date}::date
        AND tsrange(
          date + start_time::time,
          end_time
        ) && tsrange(
          ${date}::timestamp + ${startTime}::time,
          ${date}::timestamp + ${startTime}::time + (${duration} || ' minutes')::interval
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

// Update insert schemas to include proper time validation
export const insertSessionSchema = createInsertSchema(sessions)
  .extend({
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    duration: z.number().min(15, "Session must be at least 15 minutes").max(180, "Session cannot exceed 3 hours"),
  })
  .omit({ createdAt: true, deletedAt: true });

export const insertClassSchema = createInsertSchema(classes)
  .extend({
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
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

// Add new tables for strength metrics and progress tracking
export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id, { onDelete: 'cascade' }).notNull(),
  progressDate: timestamp("progress_date").notNull().defaultNow(),
  weight:numeric("weight"),
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

export const strengthMetrics = pgTable("strength_metrics", {
  id: serial("id").primaryKey(),
  progressId: integer("progress_id").references(() => progress.id, { onDelete: 'cascade' }).notNull(),
  exerciseId: integer("exercise_id").references(() => exercises.id, { onDelete: 'restrict' }).notNull(),
  weightAmount: numeric("weight_amount"), // Using consistent naming with snake_case for DB columns
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

// Add new relations for progress tracking
export const progressRelations = relations(progress, ({ one, many }) => ({
  member: one(members, {
    fields: [progress.memberId],
    references: [members.id],
  }),
  strengthMetrics: many(strengthMetrics)
}));

export const strengthMetricsRelations = relations(strengthMetrics, ({ one }) => ({
  progress: one(progress, {
    fields: [strengthMetrics.progressId],
    references: [progress.id],
  }),
  exercise: one(exercises, {
    fields: [strengthMetrics.exerciseId],
    references: [exercises.id],
  })
}));

// Update insert schemas with stronger validation
export const insertProgressSchema = createInsertSchema(progress)
  .extend({
    weight: z.string()
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
        "Weight must be a positive number")
      .optional(),
    bodyFatPercentage: z.string()
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100,
        "Body fat percentage must be between 0 and 100")
      .optional(),
    measurements: z.object({
      chest: z.number().positive("Chest measurement must be positive").optional(),
      waist: z.number().positive("Waist measurement must be positive").optional(),
      hips: z.number().positive("Hips measurement must be positive").optional(),
      thighs: z.number().positive("Thigh measurement must be positive").optional(),
      arms: z.number().positive("Arm measurement must be positive").optional()
    }).default({}),
    notes: z.string().optional()
  })
  .omit({ progressDate: true, updatedAt: true });

export const insertStrengthMetricSchema = createInsertSchema(strengthMetrics)
  .extend({
    weightAmount: z.string()
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
        "Weight must be a positive number")
      .optional(),
    numberOfSets: z.number()
      .int("Number of sets must be a whole number")
      .positive("Must have at least one set")
      .optional(),
    numberOfReps: z.number()
      .int("Number of reps must be a whole number")
      .positive("Must have at least one rep")
      .optional(),
    exerciseNotes: z.string().optional()
  })
  .omit({ id: true, createdAt: true });

// Add corresponding types
export type Progress = typeof progress.$inferSelect;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type StrengthMetric = typeof strengthMetrics.$inferSelect;
export type InsertStrengthMetric = z.infer<typeof insertStrengthMetricSchema>;

export const classTemplatesRelations = relations(classTemplates, ({ one, many }) => ({
  trainer: one(users, {
    fields: [classTemplates.trainerId],
    references: [users.id],
  }),
  classes: many(classes)
}));

export const classWaitlistRelations = relations(classWaitlist, ({ one }) => ({
  class: one(classes, {
    fields: [classWaitlist.classId],
    references: [classes.id],
  }),
  member: one(members, {
    fields: [classWaitlist.memberId],
    references: [members.id],
  })
}));

// Add insert schemas
export const insertClassTemplateSchema = createInsertSchema(classTemplates)
  .extend({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    duration: z.number().min(15, "Class must be at least 15 minutes").max(180, "Class cannot exceed 3 hours"),
    capacity: z.number().min(1, "Class must have at least 1 spot"),
    dayOfWeek: z.number().min(0, "Invalid day").max(6, "Invalid day")
  })
  .omit({ createdAt: true });

export const insertClassWaitlistSchema = createInsertSchema(classWaitlist)
  .extend({
    position: z.number().min(1, "Position must be positive")
  })
  .omit({ createdAt: true });

// Add types
export type ClassTemplate = typeof classTemplates.$inferSelect;
export type InsertClassTemplate = z.infer<typeof insertClassTemplateSchema>;
export type ClassWaitlist = typeof classWaitlist.$inferSelect;
export type InsertClassWaitlist = z.infer<typeof insertClassWaitlistSchema>;

// Add new payment-related tables after the existing tables
import { payments, paymentsRelations, insertPaymentSchema, Payment, InsertPayment } from './payments';
import { subscriptions, subscriptionsRelations, insertSubscriptionSchema, Subscription, InsertSubscription } from './subscriptions';
// Re-export payment and subscription types
export * from './payments';
export * from './subscriptions';