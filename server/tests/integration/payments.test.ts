import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../../db';
import { payments } from '../../../shared/payments';
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
      // Create test user and member
      const user = await createTestUser({ role: 'user' });
      const gymLocation = await createTestGymLocation();
      const member = await createTestMember(user, gymLocation);

      // Create payment
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
});