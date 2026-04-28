// ===========================================
// Stripe Service - Integration Tests
// ===========================================
//
// Tests with REAL Stripe Test Keys
// Run: npm run test --prefix backend -- stripe.service.integration.spec.ts --runInBand
//
// ⚠️  WARNING: This will make real API calls to Stripe test environment

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';

describe('StripeService - Integration Tests (Real API)', () => {
  let service: StripeService;
  let configService: ConfigService;
  let skipTests = false;

  // Use actual env vars for real Stripe testing
  beforeAll(() => {
    // Skip all tests if Stripe key not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      skipTests = true;
    }
  });

  // Use actual env vars for real Stripe testing
  beforeEach(async () => {
    if (skipTests) {
      return;
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
                STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
                STRIPE_PUBLISHABLE_KEY:
                  process.env.STRIPE_PUBLISHABLE_KEY || '',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);

    // Skip if no Stripe key configured
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.log('⚠️  Skipping integration tests - STRIPE_SECRET_KEY not set');
      return;
    }
  });

  describe('Real Stripe API', () => {
    beforeEach(() => {
      if (skipTests) {
        console.log(
          '⏭️  Skipping integration tests - set STRIPE_SECRET_KEY environment variable to run',
        );
      }
    });

    it('should be configured', () => {
      if (skipTests) {
        expect(true).toBe(true); // Skip
        return;
      }
      expect(service.isConfigured()).toBe(true);
    });

    it('should create a real Stripe customer', async () => {
      if (skipTests) {
        expect(true).toBe(true);
        return;
      }
      const email = `test-${Date.now()}@example.tn`;

      const customer = await service.createOrGetCustomer({
        email,
        name: 'Test Customer',
        metadata: {
          userId: 'test-user-001',
          role: 'tenant',
        },
      });

      expect(customer).toBeDefined();
      expect(customer.id).toMatch(/^cus_/);
      expect(customer.email).toBe(email);

      console.log('✅ Created customer:', customer.id);
    });

    it('should create a real payment intent', async () => {
      if (skipTests) {
        expect(true).toBe(true);
        return;
      }
      // First create customer
      const customer = await service.createOrGetCustomer({
        email: `test-${Date.now()}@example.tn`,
        name: 'Test User',
      });

      // Create payment intent
      const paymentIntent = await service.createPaymentIntent({
        amount: 150000, // 150 TND
        currency: 'TND',
        customerId: customer.id,
        description: 'Test rent payment',
        metadata: {
          leaseId: 'lease-test-001',
          tenantId: customer.id,
        },
      });

      expect(paymentIntent).toBeDefined();
      expect(paymentIntent.id).toMatch(/^pi_/);
      expect(paymentIntent.status).toBe('requires_payment_method');
      expect(paymentIntent.amount).toBe(150000);

      console.log('✅ Created payment intent:', paymentIntent.id);
      console.log('   Status:', paymentIntent.status);
      console.log(
        '   Client Secret:',
        paymentIntent.client_secret?.substring(0, 20) + '...',
      );
    });

    it('should retrieve payment intent', async () => {
      if (skipTests) {
        expect(true).toBe(true);
        return;
      }
      // Create one first
      const customer = await service.createOrGetCustomer({
        email: `test-${Date.now()}@example.tn`,
        name: 'Test User',
      });

      const created = await service.createPaymentIntent({
        amount: 100000,
        currency: 'TND',
        customerId: customer.id,
        description: 'Test',
      });

      // Now retrieve it
      const retrieved = await service.getPaymentIntent(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.amount).toBe(100000);

      console.log('✅ Retrieved payment intent:', retrieved.id);
    });

    it('should get publishable key', () => {
      if (skipTests) {
        expect(true).toBe(true);
        return;
      }
      const key = service.getPublishableKey();
      expect(key).toBeDefined();
      expect(key).toMatch(/^pk_test_/);

      console.log(
        '✅ Publishable key retrieved:',
        key.substring(0, 20) + '...',
      );
    });
  });
});
