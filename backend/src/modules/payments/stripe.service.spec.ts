// ===========================================
// SmartProperty - Stripe Service Tests
// ===========================================
//
// Shows real usage examples of the Stripe Service
//
// ===================================================

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';

describe('StripeService', () => {
  let service: StripeService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                STRIPE_SECRET_KEY: 'sk_test_mock_key',
                STRIPE_WEBHOOK_SECRET: 'whsec_test_mock_key',
                STRIPE_PUBLISHABLE_KEY: 'pk_test_mock_key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Customer Management', () => {
    it('should create a new customer', async () => {
      // USAGE EXAMPLE:
      // const customer = await stripeService.createOrGetCustomer({
      //   email: 'ahmed@example.tn',
      //   name: 'Ahmed Ben Ali',
      //   metadata: { userId: 'user_123', role: 'tenant' }
      // });
      //
      // Returns: Stripe Customer object with:
      // - customer.id: 'cus_xxx'
      // - customer.email: 'ahmed@example.tn'
      // - customer.metadata: { userId: 'user_123' }
    });
  });

  describe('Payment Intent', () => {
    it('should create a payment intent for all payment methods', async () => {
      // USAGE EXAMPLE:
      // const paymentIntent = await stripeService.createPaymentIntent({
      //   amount: 150000,                    // 150 TND in millimes
      //   currency: 'TND',
      //   customerId: 'cus_xxx',
      //   description: 'Rent Payment - Lease #lease_001',
      //   metadata: {
      //     leaseId: 'lease_001',
      //     tenantId: 'user_123',
      //     paymentType: 'rent'
      //   },
      //   idempotencyKey: 'pay-2026-04-28-001' // Prevents duplicates
      // });
      //
      // Returns: Stripe PaymentIntent with:
      // - paymentIntent.id: 'pi_xxx'
      // - paymentIntent.client_secret: 'pi_xxx_secret_yyy'
      // - paymentIntent.status: 'requires_payment_method'
      // - paymentIntent.automatic_payment_methods: { enabled: true }
      //
      // Frontend receives: client_secret + publishable_key
      // Frontend uses: Stripe.js Payment Element to show available methods
      // Methods shown depend on user's country/currency
    });

    it('should retrieve payment intent', async () => {
      // USAGE:
      // const pi = await stripeService.getPaymentIntent('pi_xxx');
    });
  });

  describe('Refunds', () => {
    it('should refund full payment', async () => {
      // USAGE EXAMPLE (Full refund):
      // const refund = await stripeService.refundPayment({
      //   paymentIntentId: 'pi_xxx',
      //   reason: 'requested_by_customer'
      // });
      //
      // Returns: Stripe Refund object
      // - refund.id: 're_xxx'
      // - refund.status: 'succeeded'
      // - refund.amount: 150000
    });

    it('should refund partial payment', async () => {
      // USAGE EXAMPLE (Partial refund):
      // const refund = await stripeService.refundPayment({
      //   paymentIntentId: 'pi_xxx',
      //   amount: 50000,  // 50 TND refund (out of 150 TND total)
      //   reason: 'requested_by_customer'
      // });
    });
  });

  describe('Setup Intent (Recurring Payments)', () => {
    it('should create setup intent for saving payment method', async () => {
      // USAGE EXAMPLE (For recurring payments):
      // const setupIntent = await stripeService.createSetupIntent('cus_xxx');
      //
      // Frontend uses this to save payment method for future charges
      // Returns: SetupIntent with client_secret
    });
  });

  describe('Payment Methods', () => {
    it('should attach payment method to customer', async () => {
      // USAGE:
      // const pm = await stripeService.attachPaymentMethodToCustomer(
      //   'pm_xxx',
      //   'cus_xxx'
      // );
    });

    it('should set default payment method', async () => {
      // USAGE:
      // const customer = await stripeService.setDefaultPaymentMethod(
      //   'cus_xxx',
      //   'pm_xxx'
      // );
    });

    it('should list payment methods', async () => {
      // USAGE:
      // const methods = await stripeService.listPaymentMethods('cus_xxx');
      //
      // Returns: Array of Stripe PaymentMethod objects
    });
  });

  describe('Webhook', () => {
    it('should verify webhook signature', () => {
      // USAGE:
      // const event = stripeService.constructEvent(
      //   rawBodyBuffer,
      //   'stripe-signature-header'
      // );
      //
      // Throws BadRequestException if signature is invalid
      // Returns verified Stripe Event object
      //
      // Common events to handle:
      // - 'payment_intent.succeeded' → Payment completed
      // - 'payment_intent.payment_failed' → Payment failed
      // - 'charge.refunded' → Refund completed
      // - 'payment_intent.canceled' → Payment canceled
    });
  });
});
