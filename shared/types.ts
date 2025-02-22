import { z } from 'zod';
import { 
  users, members, workoutPlans, workoutLogs, schedules,
  exercises, muscleGroups, pricingPlans, gymMembershipPricing,
  membershipPricing, mealPlans, memberMealPlans, progress,
  strengthMetrics, movementPatterns, trainingPackages,
  trainingClients, memberProfiles, memberAssessments,
  memberProgressPhotos, marketingCampaigns, invoices,
  scheduledBlocks, classRegistrations, classTemplates,
  classWaitlist, classes
} from './schema';

// Re-export payment and subscription types
export type { Payment, InsertPayment } from './payments';
export type { Subscription, InsertSubscription } from './subscriptions';

// Table Types
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
export type ScheduledBlock = typeof scheduledBlocks.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type ClassRegistration = typeof classRegistrations.$inferSelect;
export type ClassTemplate = typeof classTemplates.$inferSelect;
export type ClassWaitlist = typeof classWaitlist.$inferSelect;

// Import and export insert schemas
import {
  insertUserSchema,
  insertMemberSchema,
  insertWorkoutPlanSchema,
  insertWorkoutLogSchema,
  insertScheduleSchema,
  insertExerciseSchema,
  insertMuscleGroupSchema,
  insertPricingPlanSchema,
  insertGymMembershipPricingSchema,
  insertMealPlanSchema,
  insertMemberMealPlanSchema,
  insertProgressSchema,
  insertStrengthMetricSchema,
  insertMovementPatternSchema,
  insertTrainingPackageSchema,
  insertTrainingClientSchema,
  insertMemberProfileSchema,
  insertMemberAssessmentSchema,
  insertMemberProgressPhotoSchema,
  insertInvoiceSchema,
  insertMarketingCampaignSchema,
  insertClassSchema,
  insertClassTemplateSchema,
  insertClassRegistrationSchema,
  insertClassWaitlistSchema,
} from './schema';

// Insert Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type InsertMuscleGroup = z.infer<typeof insertMuscleGroupSchema>;
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
export type InsertGymMembershipPricing = z.infer<typeof insertGymMembershipPricingSchema>;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type InsertMemberMealPlan = z.infer<typeof insertMemberMealPlanSchema>;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type InsertStrengthMetric = z.infer<typeof insertStrengthMetricSchema>;
export type InsertMovementPattern = z.infer<typeof insertMovementPatternSchema>;
export type InsertTrainingPackage = z.infer<typeof insertTrainingPackageSchema>;
export type InsertTrainingClient = z.infer<typeof insertTrainingClientSchema>;
export type InsertMemberProfile = z.infer<typeof insertMemberProfileSchema>;
export type InsertMemberAssessment = z.infer<typeof insertMemberAssessmentSchema>;
export type InsertMemberProgressPhoto = z.infer<typeof insertMemberProgressPhotoSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type InsertClassTemplate = z.infer<typeof insertClassTemplateSchema>;
export type InsertClassRegistration = z.infer<typeof insertClassRegistrationSchema>;
export type InsertClassWaitlist = z.infer<typeof insertClassWaitlistSchema>;