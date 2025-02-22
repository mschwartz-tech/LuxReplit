import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { members } from "./schema";

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  amount: numeric("amount").notNull(),
  status: text("status", {
    enum: ["pending", "completed", "failed", "refunded"]
  }).notNull(),
  paymentMethod: text("payment_method", {
    enum: ["credit_card", "debit_card", "bank_transfer", "cash"]
  }).notNull(),
  transactionId: text("transaction_id"),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  member: one(members, {
    fields: [payments.memberId],
    references: [members.id],
  })
}));

export const insertPaymentSchema = createInsertSchema(payments)
  .extend({
    amount: z.number().or(z.string()).transform(val =>
      typeof val === 'string' ? parseFloat(val) : val
    ),
    memberId: z.string().transform(val => parseInt(val)).optional(),
    status: z.enum(["pending", "completed", "failed", "refunded"]).default("pending"),
  })
  .omit({ 
    createdAt: true,
    updatedAt: true,
    transactionId: true,
    metadata: true
  });

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;