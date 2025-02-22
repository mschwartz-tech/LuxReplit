import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { payments } from '../../../shared/schema';
import { createTestUser, createTestGymLocation, createTestMember, cleanupTestData } from '../utils/test-helpers';

describe('Payment Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Payment Creation', () => {
    it('should create a payment with member association', async () => {
      const user = await createTestUser({ role: 'user' });
      const gymLocation = await createTestGymLocation();
      const member = await createTestMember(user, gymLocation);

      const [payment] = await db.insert(payments).values({
        memberId: member.id,
        amount: "100.00",
        paymentMethod: 'credit_card',
        status: 'pending',
        description: 'Monthly membership payment',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      expect(payment).toBeDefined();
      expect(payment.amount).toBe('100.00');
      expect(payment.memberId).toBe(member.id);
      expect(payment.status).toBe('pending');
    });

    it('should create a payment without member association', async () => {
      const [payment] = await db.insert(payments).values({
        amount: "50.00",
        paymentMethod: 'cash',
        status: 'completed',
        description: 'Walk-in payment',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      expect(payment).toBeDefined();
      expect(payment.amount).toBe('50.00');
      expect(payment.memberId).toBeNull();
      expect(payment.status).toBe('completed');
    });

    it('should reject invalid payment method', async () => {
      await expect(db.insert(payments).values({
        amount: "75.00",
        paymentMethod: 'invalid_method' as any,
        status: 'pending',
        description: 'Test payment',
        createdAt: new Date(),
        updatedAt: new Date()
      })).rejects.toThrow();
    });

    it('should enforce payment status constraints', async () => {
      await expect(db.insert(payments).values({
        amount: "75.00",
        paymentMethod: 'credit_card',
        status: 'invalid_status' as any,
        description: 'Test payment',
        createdAt: new Date(),
        updatedAt: new Date()
      })).rejects.toThrow();
    });
  });

  describe('Payment Status Updates', () => {
    it('should update payment status from pending to completed', async () => {
      const user = await createTestUser({ role: 'user' });
      const gymLocation = await createTestGymLocation();
      const member = await createTestMember(user, gymLocation);

      const [payment] = await db.insert(payments).values({
        memberId: member.id,
        amount: "150.00",
        paymentMethod: 'credit_card',
        status: 'pending',
        description: 'Membership renewal',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const [updatedPayment] = await db
        .update(payments)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(payments.id, payment.id))
        .returning();

      expect(updatedPayment.status).toBe('completed');
      expect(updatedPayment.updatedAt).not.toEqual(payment.updatedAt);
    });

    it('should handle payment failure', async () => {
      const [payment] = await db.insert(payments).values({
        amount: "200.00",
        paymentMethod: 'bank_transfer',
        status: 'pending',
        description: 'Advance booking',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const [failedPayment] = await db
        .update(payments)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(payments.id, payment.id))
        .returning();

      expect(failedPayment.status).toBe('failed');
      expect(failedPayment.updatedAt).not.toEqual(payment.updatedAt);
    });
  });

  describe('Payment Validation', () => {
    it('should require valid amount format', async () => {
      await expect(db.insert(payments).values({
        amount: "invalid_amount",
        paymentMethod: 'credit_card',
        status: 'pending',
        description: 'Test payment',
        createdAt: new Date(),
        updatedAt: new Date()
      })).rejects.toThrow();
    });

    it('should require non-negative amount', async () => {
      await expect(db.insert(payments).values({
        amount: "-50.00",
        paymentMethod: 'credit_card',
        status: 'pending',
        description: 'Test payment',
        createdAt: new Date(),
        updatedAt: new Date()
      })).rejects.toThrow();
    });

    it('should require payment description', async () => {
      await expect(db.insert(payments).values({
        amount: "50.00",
        paymentMethod: 'credit_card',
        status: 'pending',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date()
      })).rejects.toThrow();
    });
  });
});