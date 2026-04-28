// ===========================================
// Payment DTOs - Validation Tests
// ===========================================

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePaymentDto } from './create-payment.dto';
import { PaymentQueryDto } from './payment-query.dto';

describe('Payment DTOs - Validation', () => {
  describe('CreatePaymentDto', () => {
    it('should validate valid payment data', async () => {
      const dto = plainToInstance(CreatePaymentDto, {
        leaseId: '507f1f77bcf86cd799439011',
        tenantId: '507f1f77bcf86cd799439012',
        amount: 150000, // 150 TND in millimes
        type: 'rent',
        idempotencyKey: 'pay-2026-04-28-001',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject missing required fields', async () => {
      const dto = plainToInstance(CreatePaymentDto, {
        leaseId: '507f1f77bcf86cd799439011',
        // Missing tenantId, amount, type
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid ObjectId', async () => {
      const dto = plainToInstance(CreatePaymentDto, {
        leaseId: 'invalid-id',
        tenantId: '507f1f77bcf86cd799439012',
        amount: 150000,
        type: 'rent',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject negative amount', async () => {
      const dto = plainToInstance(CreatePaymentDto, {
        leaseId: '507f1f77bcf86cd799439011',
        tenantId: '507f1f77bcf86cd799439012',
        amount: -1000, // Negative
        type: 'rent',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject zero amount', async () => {
      const dto = plainToInstance(CreatePaymentDto, {
        leaseId: '507f1f77bcf86cd799439011',
        tenantId: '507f1f77bcf86cd799439012',
        amount: 0,
        type: 'rent',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('PaymentQueryDto', () => {
    it('should validate valid query parameters', async () => {
      const dto = plainToInstance(PaymentQueryDto, {
        page: 1,
        limit: 10,
        status: 'completed',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should use default values when optional fields are missing', async () => {
      const dto = plainToInstance(PaymentQueryDto, {});

      const errors = await validate(dto);
      // Should be valid with defaults
      expect(errors.length).toBe(0);
    });

    it('should reject invalid page number', async () => {
      const dto = plainToInstance(PaymentQueryDto, {
        page: 0, // Should be >= 1
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid limit', async () => {
      const dto = plainToInstance(PaymentQueryDto, {
        limit: 1000, // Should be max 100
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
