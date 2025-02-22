import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { 
  movementPatterns,
  trainingPackages,
  trainingClients
} from './schema';

// Insert schema validations
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

// Export the types
export type InsertMovementPattern = z.infer<typeof insertMovementPatternSchema>;
export type InsertTrainingPackage = z.infer<typeof insertTrainingPackageSchema>;
export type InsertTrainingClient = z.infer<typeof insertTrainingClientSchema>;

// Re-export payment and subscription types
export type { Payment, InsertPayment } from './payments';
export type { Subscription, InsertSubscription } from './subscriptions';