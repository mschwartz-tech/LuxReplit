import { pgTable, serial, integer, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Import only the type references
import type { Member } from "./schema";

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),  // Remove direct reference
  type: text("type", {
    enum: ["membership", "training"]
  }).notNull(),
  status: text("status", {
    enum: ["active", "cancelled", "paused", "expired"]
  }).notNull(),
  billingCycle: text("billing_cycle", {
    enum: ["biweekly", "monthly", "annual"]
  }).notNull(),
  amount: numeric("amount").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  nextBillingDate: timestamp("next_billing_date"),
  autoRenew: boolean("auto_renew").notNull().default(true),
  canceledAt: timestamp("canceled_at"),
  metadata: text("metadata"),  // For storing subscription-specific details
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  member: one(subscriptions, {
    fields: [subscriptions.memberId],
    references: [subscriptions.id],
  })
}));

export const insertSubscriptionSchema = createInsertSchema(subscriptions)
  .extend({
    amount: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
  })
  .omit({ 
    createdAt: true,
    updatedAt: true,
    canceledAt: true,
    metadata: true
  });

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;