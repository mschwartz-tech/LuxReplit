import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from 'drizzle-orm';
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { payments, paymentsRelations, type Payment, type InsertPayment } from './payments';
import { subscriptions, subscriptionsRelations, type Subscription, type InsertSubscription } from './subscriptions';

// Table Definitions
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

const usersRelations = relations(users, ({ many }) => ({
members: many(members),
trainers: many(members, { relationName: "trainer" }),
marketingCampaigns: many(marketingCampaigns),
mealPlans: many(mealPlans)
}));

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

const membersRelations = relations(members, ({ one, many }) => ({
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

const memberProfiles = pgTable("member_profiles", {
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

const memberAssessments = pgTable("member_assessments", {
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

const memberProgressPhotos = pgTable("member_progress_photos", {
id: serial("id").primaryKey(),
memberId: integer("member_id").references(() => members.id).notNull(),
photoUrl: text("photo_url").notNull(),
photoDate: timestamp("photo_date").notNull(),
category: text("category", { enum: ["front", "back", "side"] }).notNull(),
notes: text("notes"),
createdAt: timestamp("created_at").notNull().defaultNow()
});

const insertMemberProgressPhotoSchema = createInsertSchema(memberProgressPhotos)
  .extend({
    memberId: z.string().transform(val => parseInt(val)),
    photoDate: z.coerce.date(),
    category: z.enum(["front", "back", "side"]),
  })
  .omit({
    createdAt: true,
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
tips: text("tips").array(),
equipment: text("equipment").array(),
videoUrl: text("video_url"),
createdAt: timestamp("created_at").notNull().defaultNow()
});

const pricingPlans = pgTable("pricing_plans", {
id: serial("id").primaryKey(),
sessionsPerWeek: integer("sessions_per_week").notNull(),
duration: integer("duration").notNull(), // 30 or 60 minutes
costPerSession: numeric("cost_per_session").notNull(),
biweeklyPrice: numeric("biweekly_price").notNull(),
pifPrice: numeric("pif_price").notNull(), // Paid in full price
createdAt: timestamp("created_at").notNull().defaultNow(),
updatedAt: timestamp("updated_at").notNull().defaultNow()
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

const mealPlans = pgTable("meal_plans", {
id: serial("id").primaryKey(),
trainerId: integer("trainer_id").references(() => users.id),
name: text("name").notNull(),
description: text("description"),
meals: jsonb("meals").notNull(),
createdAt: timestamp("created_at").notNull().defaultNow()
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

const classes = pgTable("classes", {
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

const scheduledBlocks = pgTable("scheduled_blocks_view", {
trainerId: integer("trainer_id").notNull(),
date: timestamp("date").notNull(),
time: text("time").notNull(),
endTime: timestamp("end_time").notNull(),
type: text("type", { enum: ["session", "class"] }).notNull(),
id: integer("id").notNull()
});

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

const schedulesRelations = relations(schedules, ({ one }) => ({
trainer: one(users, {
  fields: [schedules.trainerId],
  references: [users.id],
}),
member: one(members, {
  fields: [schedules.memberId],
  references: [members.id],
})
}));

const exercisesRelations = relations(exercises, ({ one, many }) => ({
primaryMuscleGroup: one(muscleGroups, {
  fields: [exercises.primaryMuscleGroupId],
  references: [muscleGroups.id],
}),
// Add relation to strength metrics
strengthMetrics: many(strengthMetrics)
}));

const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
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

const membershipPricingRelations = relations(membershipPricing, ({ many }) => ({
members: many(members)
}));

const progress = pgTable("progress", {
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

const strengthMetrics = pgTable("strength_metrics", {
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

const progressRelations = relations(progress, ({ one, many }) => ({
member: one(members, {
  fields: [progress.memberId],
  references: [members.id],
}),
strengthMetrics: many(strengthMetrics)
}));

const strengthMetricsRelations = relations(strengthMetrics, ({ one }) => ({
progress: one(progress, {
  fields: [strengthMetrics.progressId],
  references: [progress.id],
}),
exercise: one(exercises, {
  fields: [strengthMetrics.exerciseId],
  references: [exercises.id],
})
}));

const insertMealPlanSchema = createInsertSchema(mealPlans)
  .extend({
    trainerId: z.string().transform(val => parseInt(val)).optional(),
    meals: z.record(z.unknown()).or(z.string()).transform(val =>
      typeof val === 'string' ? JSON.parse(val) : val
    ),
  })
  .omit({
    createdAt: true,
  });

const insertMemberMealPlanSchema = createInsertSchema(memberMealPlans)
  .extend({
    memberId: z.string().transform(val => parseInt(val)),
    mealPlanId: z.string().transform(val => parseInt(val)),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    customMeals: z.record(z.unknown()).optional(),
    status: z.enum(["pending", "active", "completed"]).default("pending"),
  })
  .omit({
    assignedAt: true
  });

const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns)
  .extend({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    createdBy: z.string().transform(val => parseInt(val)).optional(),
    status: z.enum(["draft", "active", "completed"]).default("draft"),
    targetAudience: z.enum(["all", "active", "inactive"]).default("all"),
  })
  .omit({
    id: true,
  });

const insertInvoiceSchema = createInsertSchema(invoices)
  .extend({
    amount: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
    memberId: z.string().transform(val => parseInt(val)).optional(),
    status: z.enum(["pending", "paid", "cancelled"]).default("pending"),
  })
  .omit({
    createdAt: true,
  });


// Import necessary parts from movement_patterns, training_packages tables
// Add after the existing table definitions but before the relations

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

// Add relations for new tables
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

// Add movement pattern relation to exercises
// Remove the incorrect relation and use proper TypeScript
const exercisesWithMovementPatterns = exercises.$inferSelect;
const exercisesMovementRelations = relations(exercises, ({ one }) => ({
movementPattern: one(movementPatterns, {
  fields: [exercises.primaryMuscleGroupId],
  references: [movementPatterns.id],
})
}));

const classTemplatesRelations = relations(classTemplates, ({ one, many }) => ({
 trainer: one(users, {
   fields: [classTemplates.trainerId],
   references: [users.id],
 }),
 classes: many(classes)
}));

const classWaitlistRelations = relations(classWaitlist, ({ one }) => ({
 class: one(classes, {
   fields: [classWaitlist.classId],
   references: [classes.id],
 }),
 member: one(members, {
   fields: [classWaitlist.memberId],
   references: [members.id],
 })
}));

//Type definitions
type MealPlan = typeof mealPlans.$inferSelect;
type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
type MemberMealPlan = typeof memberMealPlans.$inferSelect;
type InsertMemberMealPlan = z.infer<typeof insertMemberMealPlanSchema>;

type Invoice = typeof invoices.$inferSelect;
type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
type MemberAssessment = typeof memberAssessments.$inferSelect;
type InsertMemberAssessment = z.infer<typeof insertMemberAssessmentSchema>;
type MemberProgressPhoto = typeof memberProgressPhotos.$inferSelect;
type InsertMemberProgressPhoto = z.infer<typeof insertMemberProgressPhotoSchema>;
type PricingPlan = typeof pricingPlans.$inferSelect;
type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;

const insertMemberProfileSchema = createInsertSchema(memberProfiles)
  .extend({
    userId: z.string().transform(val => parseInt(val)),
    birthDate: z.coerce.date().optional(),
    fitnessGoals: z.array(z.string()).optional(),
    healthConditions: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(), // Fixed: Added parentheses
    injuries: z.array(z.string()).optional(),
    preferredContactMethod: z.enum(["email", "phone", "text"]).optional(),
    marketingOptIn: z.boolean().optional(),
    hadPhysicalLastYear: z.boolean().optional(),
    physicianClearance: z.boolean().optional()
  })
  .omit({
    createdAt: true,
    updatedAt: true,
  });

// Add member schema definition and export
const insertMemberSchema = createInsertSchema(members)
  .extend({
    userId: z.string().transform(val => parseInt(val)),
    assignedTrainerId: z.string().transform(val => parseInt(val)).optional(),
    gymLocationId: z.string().transform(val => parseInt(val)),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
  })
  .omit({
    createdAt: true,
  });

// Export type
type InsertMember = z.infer<typeof insertMemberSchema>;

// Add gym membership pricing schema
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

// Export type
type InsertGymMembershipPricing = z.infer<typeof insertGymMembershipPricingSchema>;

// Export all the tables and relations
export {
  // Tables
  users, members, memberProfiles, memberAssessments,
  memberProgressPhotos, workoutPlans, workoutLogs,
  schedules, invoices, marketingCampaigns, muscleGroups,
  exercises, pricingPlans, gymMembershipPricing,
  membershipPricing, mealPlans, memberMealPlans,
  sessions, classes, classRegistrations, classTemplates,
  classWaitlist, progress, strengthMetrics, payments,
  subscriptions, scheduledBlocks, movementPatterns,
  trainingPackages, trainingClients,

  // Relations
  usersRelations, membersRelations, sessionsRelations,
  classesRelations, classRegistrationsRelations,
  schedulesRelations, exercisesRelations,
  workoutPlansRelations, membershipPricingRelations,
  progressRelations, strengthMetricsRelations,
  paymentsRelations, subscriptionsRelations,
  movementPatternsRelations, trainingPackagesRelations,
  trainingClientsRelations, exercisesMovementRelations,
  classTemplatesRelations, classWaitlistRelations,

  // Insert Schemas
  insertMealPlanSchema,
  insertMemberMealPlanSchema,
  insertInvoiceSchema,
  insertMarketingCampaignSchema,
  insertMemberAssessmentSchema,
  insertMemberProgressPhotoSchema,
  insertPricingPlanSchema,insertMemberProfileSchema,
  insertMemberSchema,
  insertGymMembershipPricingSchema,

  // Types
  Payment,
  InsertPayment,
  Subscription,
  InsertSubscription,
  MealPlan,
  InsertMealPlan,
  MemberMealPlan,
  InsertMemberMealPlan,
  Invoice,
  InsertInvoice,
  MemberAssessment,
  InsertMemberAssessment,
  MemberProgressPhoto,
  InsertMemberProgressPhoto,
  PricingPlan,
  InsertPricingPlan,
  InsertMember,
  InsertGymMembershipPricing,
};