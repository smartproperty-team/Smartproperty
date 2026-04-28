// ===========================================
// SmartProperty - Stripe Service
// ===========================================
//
// Handles all Stripe API operations:
// - Create payment intents (supports ALL payment methods)
// - Create/manage customers
// - Process refunds
// - Handle webhooks
// - Track transactions
//
// ===================================================

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface CreatePaymentIntentParams {
  amount: number; // millimes (TND × 1000)
  currency: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

interface CreateCustomerParams {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

interface RefundParams {
  paymentIntentId: string;
  amount?: number; // optional partial refund in millimes
  reason?: string;
}

@Injectable()
export class StripeService {
  private stripe: any;
  private readonly logger = new Logger(StripeService.name);
  private readonly webhookSecret: string;
  private readonly publishableKey: string;

  constructor(private configService: ConfigService) {
    // Initialize Stripe with secret key
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('❌ STRIPE_SECRET_KEY is not configured in .env');
    }

    this.stripe = new Stripe(secretKey);

    // Store webhook secret and publishable key
    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    this.publishableKey =
      this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') || '';

    this.logger.log('✅ Stripe Service Initialized');
  }

  // ─────────────────────────────────────────────────────────
  // CUSTOMER MANAGEMENT
  // ─────────────────────────────────────────────────────────

  /**
   * Create or get existing Stripe customer
   * Prevents duplicate customers by email
   */
  async createOrGetCustomer(params: CreateCustomerParams): Promise<any> {
    try {
      this.logger.debug(`🔍 Looking for customer: ${params.email}`);

      // Check if customer already exists
      const existingCustomers = await this.stripe.customers.list({
        email: params.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        this.logger.log(`✅ Found existing customer: ${params.email}`);
        return existingCustomers.data[0];
      }

      // Create new customer
      this.logger.debug(`📝 Creating new customer: ${params.email}`);
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });

      this.logger.log(`✅ Created Stripe customer: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error('❌ Failed to create/get customer', error);
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Update customer metadata
   */
  async updateCustomer(
    customerId: string,
    metadata: Record<string, string>,
  ): Promise<any> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        metadata,
      });
      this.logger.log(`✅ Updated customer: ${customerId}`);
      return customer;
    } catch (error) {
      this.logger.error('❌ Failed to update customer', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────
  // PAYMENT INTENT MANAGEMENT (ALL PAYMENT METHODS)
  // ─────────────────────────────────────────────────────────

  /**
   * Create Payment Intent
   *
   * Supports ALL payment methods:
   * - Cards (Visa, Mastercard, Amex)
   * - Digital Wallets (Apple Pay, Google Pay)
   * - Bank Transfers (SEPA, ACH, iDEAL)
   * - BNPL (Klarna, Afterpay)
   * - Regional methods (Alipay, WeChat, etc.)
   *
   * Stripe automatically shows available methods based on customer location
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<any> {
    try {
      this.logger.debug(
        `💳 Creating payment intent: ${(params.amount / 1000).toFixed(3)} TND`,
      );

      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: params.amount,
          currency: params.currency.toLowerCase(),
          customer: params.customerId,
          description: params.description,
          metadata: params.metadata,
          // ✅ KEY: Automatically enables ALL available payment methods
          automatic_payment_methods: {
            enabled: true,
          },
          statement_descriptor: 'SmartProperty Payment',
        },
        {
          // Idempotency: If request fails, retry is safe (won't duplicate)
          idempotencyKey: params.idempotencyKey,
        },
      );

      this.logger.log(
        `✅ Created payment intent: ${paymentIntent.id} | Status: ${paymentIntent.status}`,
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error('❌ Failed to create payment intent', error);
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  /**
   * Retrieve payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      this.logger.debug(`🔍 Retrieving payment intent: ${paymentIntentId}`);
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      this.logger.error('❌ Failed to retrieve payment intent', error);
      throw new BadRequestException('Payment intent not found');
    }
  }

  /**
   * Confirm payment intent (frontend calls this after collecting payment method)
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<any> {
    try {
      this.logger.debug(`✅ Confirming payment intent: ${paymentIntentId}`);

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        {
          payment_method: paymentMethodId,
        },
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error('❌ Failed to confirm payment intent', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────
  // REFUND HANDLING
  // ─────────────────────────────────────────────────────────

  /**
   * Refund a payment
   * @param params.paymentIntentId - Stripe payment intent ID
   * @param params.amount - Optional: partial refund in millimes
   * @param params.reason - Reason for refund (for audit trail)
   */
  async refundPayment(params: RefundParams): Promise<any> {
    try {
      this.logger.debug(
        `🔄 Refunding payment intent: ${params.paymentIntentId}`,
      );

      if (params.amount) {
        this.logger.debug(
          `   Amount: ${(params.amount / 1000).toFixed(3)} TND`,
        );
      } else {
        this.logger.debug('   Full refund');
      }

      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount,
        reason:
          (params.reason as
            | 'duplicate'
            | 'fraudulent'
            | 'requested_by_customer'
            | undefined) || 'requested_by_customer',
      });

      this.logger.log(
        `✅ Refund created: ${refund.id} | Status: ${refund.status}`,
      );

      return refund;
    } catch (error) {
      this.logger.error('❌ Failed to refund payment', error);
      throw new BadRequestException('Failed to process refund');
    }
  }

  /**
   * Get refund status
   */
  async getRefund(refundId: string): Promise<any> {
    try {
      return await this.stripe.refunds.retrieve(refundId);
    } catch (error) {
      this.logger.error('❌ Failed to retrieve refund', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────
  // SETUP INTENT (For Saving Payment Methods)
  // ─────────────────────────────────────────────────────────

  /**
   * Create SetupIntent for saving payment methods
   * Used for recurring/future payments
   */
  async createSetupIntent(customerId: string): Promise<any> {
    try {
      this.logger.debug(`📝 Creating setup intent for customer: ${customerId}`);

      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`✅ Created setup intent: ${setupIntent.id}`);
      return setupIntent;
    } catch (error) {
      this.logger.error('❌ Failed to create setup intent', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────
  // PAYMENT METHOD MANAGEMENT
  // ─────────────────────────────────────────────────────────

  /**
   * Save/Attach payment method to customer
   */
  async attachPaymentMethodToCustomer(
    paymentMethodId: string,
    customerId: string,
  ): Promise<any> {
    try {
      this.logger.debug(
        `🔗 Attaching payment method ${paymentMethodId} to customer ${customerId}`,
      );

      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customerId,
        },
      );

      this.logger.log(`✅ Payment method attached to customer`);
      return paymentMethod;
    } catch (error) {
      this.logger.error('❌ Failed to attach payment method', error);
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<any> {
    try {
      this.logger.debug(
        `⭐ Setting default payment method for customer ${customerId}`,
      );

      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      this.logger.log(`✅ Default payment method set`);
      return customer;
    } catch (error) {
      this.logger.error('❌ Failed to set default payment method', error);
      throw error;
    }
  }

  /**
   * List payment methods for customer
   */
  async listPaymentMethods(customerId: string): Promise<any[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      this.logger.error('❌ Failed to list payment methods', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────
  // WEBHOOK MANAGEMENT
  // ─────────────────────────────────────────────────────────

  /**
   * Construct and verify webhook event signature
   * CRITICAL: Ensures webhook came from Stripe, not attacker
   */
  constructEvent(body: Buffer | string, signature: string): any {
    try {
      this.logger.debug('🔐 Verifying webhook signature');

      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret,
      );

      this.logger.log(`✅ Webhook verified: ${event.type}`);
      return event;
    } catch (error) {
      this.logger.error('❌ Webhook signature verification failed', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  // ─────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────

  /**
   * Get Stripe publishable key for frontend
   */
  getPublishableKey(): string {
    if (!this.publishableKey) {
      this.logger.warn('⚠️  Stripe publishable key not configured');
    }
    return this.publishableKey;
  }

  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return !!(this.stripe && this.publishableKey && this.webhookSecret);
  }

  /**
   * Get Stripe instance (for advanced operations)
   */
  getStripeInstance(): any {
    return this.stripe;
  }
}
