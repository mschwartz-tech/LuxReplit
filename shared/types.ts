import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import type {
  users,
  members,
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
  movementPatterns,
  trainingPackages,
  trainingClients
} from './schema';

// Type definitions based on table schemas
export type User = typeof users.$inferSelect;
export type Member = typeof members.$inferSelect;
export type MemberProfile = typeof memberProfiles.$inferSelect;
export type MemberAssessment = typeof memberAssessments.$inferSelect;
export type MemberProgressPhoto = typeof memberProgressPhotos.$inferSelect;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type MuscleGroup = typeof muscleGroups.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type PricingPlan = typeof pricingPlans.$inferSelect;
export type GymMembershipPricing = typeof gymMembershipPricing.$inferSelect;
export type MembershipPricing = typeof membershipPricing.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type MemberMealPlan = typeof memberMealPlans.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type ClassRegistration = typeof classRegistrations.$inferSelect;
export type ClassTemplate = typeof classTemplates.$inferSelect;
export type ClassWaitlist = typeof classWaitlist.$inferSelect;
export type Progress = typeof progress.$inferSelect;
export type StrengthMetric = typeof strengthMetrics.$inferSelect;
export type MovementPattern = typeof movementPatterns.$inferSelect;
export type TrainingPackage = typeof trainingPackages.$inferSelect;
export type TrainingClient = typeof trainingClients.$inferSelect;

// Insert schema validations
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
export const insertMemberSchema = createInsertSchema(members)
  .extend({
    membershipType: z.enum(["luxe_essentials", "luxe_strive", "luxe_all_access", "training_only"]),
    gymLocationId: z.number(),
  })
  .omit({ createdAt: true });
export const insertMemberProfileSchema = createInsertSchema(memberProfiles).omit({ createdAt: true });
export const insertMemberAssessmentSchema = createInsertSchema(memberAssessments).omit({ createdAt: true });
export const insertMemberProgressPhotoSchema = createInsertSchema(memberProgressPhotos).omit({ createdAt: true });
export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans).omit({ createdAt: true });
export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({ createdAt: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ createdAt: true });
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({ createdAt: true });
export const insertMuscleGroupSchema = createInsertSchema(muscleGroups).omit({ createdAt: true });
export const insertExerciseSchema = createInsertSchema(exercises).omit({ createdAt: true });
export const insertPricingPlanSchema = createInsertSchema(pricingPlans).omit({ createdAt: true });
import { createInsertSchema } from "drizzle-zod";
import { gymMembershipPricing, membershipPricing, mealPlans, memberMealPlans, sessions, classes, classRegistrations, classTemplates, classWaitlist, progress, strengthMetrics, invoices, marketingCampaigns } from './schema';

export const insertGymMembershipPricingSchema = createInsertSchema(gymMembershipPricing).omit({ createdAt: true });
export const insertMembershipPricingSchema = createInsertSchema(membershipPricing).omit({ createdAt: true });
export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({ createdAt: true });
export const insertMemberMealPlanSchema = createInsertSchema(memberMealPlans).omit({ createdAt: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ createdAt: true });
export const insertClassSchema = createInsertSchema(classes).omit({ createdAt: true });
export const insertClassRegistrationSchema = createInsertSchema(classRegistrations).omit({ createdAt: true });
export const insertClassTemplateSchema = createInsertSchema(classTemplates).omit({ createdAt: true });
export const insertClassWaitlistSchema = createInsertSchema(classWaitlist).omit({ createdAt: true });
export const insertProgressSchema = createInsertSchema(progress).omit({ createdAt: true });
export const insertStrengthMetricSchema = createInsertSchema(strengthMetrics).omit({ createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ createdAt: true });
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({ createdAt: true });

export const insertMovementPatternSchema = createInsertSchema(movementPatterns)
  .extend({
    type: z.enum(["compound", "isolation", "plyometric", "bodyweight"])
  })
  .omit({ id: true });

export const insertTrainingPackageSchema = createInsertSchema(trainingPackages)
  .extend({
    sessionDuration: z.number().min(30).max(120),
    sessionsPerWeek: z.number().min(1).max(7),
    costPerSession: z.number().min(0),
    costBiWeekly: z.number().min(0),
    pifAmount: z.number().min(0),
    additionalBenefits: z.array(z.string()).optional()
  })
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertTrainingClientSchema = createInsertSchema(trainingClients)
  .extend({
    clientStatus: z.enum(["active", "inactive", "on_hold"]),
    packageType: z.string(),
    sessionsRemaining: z.number().min(0).optional()
  })
  .omit({ id: true, createdAt: true });

// Export the new types
export type InsertMovementPattern = z.infer<typeof insertMovementPatternSchema>;
export type InsertTrainingPackage = z.infer<typeof insertTrainingPackageSchema>;
export type InsertTrainingClient = z.infer<typeof insertTrainingClientSchema>;


// Re-export payment and subscription types
export type { Payment, InsertPayment } from './payments';
export type { Subscription, InsertSubscription } from './subscriptions';