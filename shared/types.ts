import { z } from 'zod';
import { 
  users, members, workoutPlans, workoutLogs, schedules,
  exercises, muscleGroups, pricingPlans, gymMembershipPricing,
  membershipPricing, mealPlans, memberMealPlans, progress,
  strengthMetrics, movementPatterns, trainingPackages,
  trainingClients, memberProfiles, memberAssessments,
  memberProgressPhotos, marketingCampaigns, invoices,
  classes, classRegistrations, classTemplates, classWaitlist,
  subscriptions
} from './schema';

// Re-export payment and subscription types
export * from './payments';
export * from './subscriptions';

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
export type Class = typeof classes.$inferSelect;
export type ClassRegistration = typeof classRegistrations.$inferSelect;
export type ClassTemplate = typeof classTemplates.$inferSelect;
export type ClassWaitlist = typeof classWaitlist.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;