import { describe, it, expect } from '@jest/globals';
import { insertPaymentSchema } from '../../../shared/payments';

describe('Payment Schema Validation', () => {
  it('should validate a valid payment', () => {
    const validPayment = {
      amount: 50.00,
      paymentMethod: 'credit_card',
      description: 'Monthly membership fee',
      status: 'pending'
    };

    const result = insertPaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it('should handle string amount conversion correctly', () => {
    const paymentWithStringAmount = {
      amount: "75.50",
      paymentMethod: 'cash',
      description: 'Personal training session',
      status: 'pending'
    };

    const result = insertPaymentSchema.safeParse(paymentWithStringAmount);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.amount).toBe('number');
      expect(result.data.amount).toBe(75.50);
    }
  });

  it('should reject invalid payment methods', () => {
    const invalidPayment = {
      amount: 100,
      paymentMethod: 'invalid_method',
      description: 'Test payment',
      status: 'pending'
    };

    const result = insertPaymentSchema.safeParse(invalidPayment);
    expect(result.success).toBe(false);
  });

  it('should reject negative amounts', () => {
    const negativePayment = {
      amount: -50,
      paymentMethod: 'credit_card',
      description: 'Test payment',
      status: 'pending'
    };

    const result = insertPaymentSchema.safeParse(negativePayment);
    expect(result.success).toBe(false);
  });

  it('should handle optional memberId correctly', () => {
    const paymentWithMemberId = {
      amount: 100,
      paymentMethod: 'credit_card',
      description: 'Member payment',
      status: 'pending',
      memberId: '123'
    };

    const result = insertPaymentSchema.safeParse(paymentWithMemberId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.memberId).toBe('number');
      expect(result.data.memberId).toBe(123);
    }
  });

  it('should accept payment without memberId', () => {
    const paymentWithoutMemberId = {
      amount: 100,
      paymentMethod: 'cash',
      description: 'Non-member payment',
      status: 'pending'
    };

    const result = insertPaymentSchema.safeParse(paymentWithoutMemberId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memberId).toBeUndefined();
    }
  });
});