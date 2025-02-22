import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Import only the type reference
import type { Member } from "./schema";

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),  // Remove direct reference
  amount: numeric("amount").notNull(),
  status: text("status", {
    enum: ["pending", "completed", "failed", "refunded"]
  }).notNull(),
  paymentMethod: text("payment_method", {
    enum: ["credit_card", "debit_card", "bank_transfer", "cash"]
  }).notNull(),
  transactionId: text("transaction_id"),  // Will store Stripe transaction ID when integrated
  description: text("description").notNull(),
  metadata: text("metadata"),  // For storing additional payment details
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  member: one(payments, {
    fields: [payments.memberId],
    references: [payments.id],
  })
}));

export const insertPaymentSchema = createInsertSchema(payments)
  .extend({
    amount: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
  })
  .omit({ 
    createdAt: true,
    updatedAt: true,
    transactionId: true 
  });

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;