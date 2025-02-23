// Import and re-export everything from schema
export * from './schema';

// Import and re-export payment types
export {
  payments,
  insertPaymentSchema,
  type Payment,
  type InsertPayment,
  type PaymentMethod,
  type PaymentStatus
} from './payments';

// Import and re-export subscription types
export {
  type Subscription,
  type InsertSubscription
} from './schema';

// Export subscription status and period enums
export const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  EXPIRED: 'expired'
} as const;

export const SubscriptionPeriod = {
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  ANNUAL: 'annual'
} as const;

export type SubscriptionStatus = typeof SubscriptionStatus[keyof typeof SubscriptionStatus];
export type SubscriptionPeriod = typeof SubscriptionPeriod[keyof typeof SubscriptionPeriod];