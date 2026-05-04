import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { Lease } from '../leases/entities/lease.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  CreatePaymentDto,
  ExportPaymentQueryDto,
  PaymentQueryDto,
} from './dto';
import { PaymentSummaryDto } from './dto/payment-response.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: MongoRepository<Payment>,
    @InjectRepository(Lease)
    private readonly leaseRepo: MongoRepository<Lease>,
    @InjectRepository(User)
    private readonly userRepo: MongoRepository<User>,
    private readonly stripeService: StripeService,
  ) {}

  private toObjectId(id: string): ObjectId {
    try {
      return new ObjectId(id);
    } catch {
      throw new BadRequestException('Invalid ObjectId format');
    }
  }

  private canAccessPayment(
    payment: Payment,
    userId: string,
    role: UserRole,
  ): boolean {
    if (role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const ownerRoles: UserRole[] = [
      UserRole.OWNER,
      UserRole.BRANCH_MANAGER,
      UserRole.REAL_ESTATE_AGENT,
      UserRole.RENTAL_MANAGER,
      UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
    ];

    if (role === UserRole.TENANT) {
      return String(payment.tenantId) === userId;
    }

    if (ownerRoles.includes(role)) {
      return (
        String(payment.ownerId) === userId ||
        String(payment.createdBy) === userId
      );
    }

    return String(payment.createdBy) === userId;
  }

  private mapPayment(payment: Payment) {
    const id = payment._id?.toHexString() || payment.id || '';

    return {
      id,
      leaseId: String(payment.leaseId),
      tenantId: String(payment.tenantId),
      ownerId: String(payment.ownerId),
      amount: payment.amount,
      currency: payment.currency,
      type: payment.type,
      status: payment.status,
      method: payment.method,
      dueDate: payment.dueDate?.toISOString?.() || new Date().toISOString(),
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      transactionId: payment.transactionId,
      description: payment.description,
      createdAt: payment.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: payment.updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  async initiatePayment(
    dto: CreatePaymentDto,
    userId: string,
    role: UserRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const lease = await this.leaseRepo.findOne({
      where: { _id: this.toObjectId(dto.leaseId) as any },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.tenantId !== dto.tenantId) {
      throw new BadRequestException('Tenant does not match lease tenant');
    }

    if (role === UserRole.TENANT && userId !== dto.tenantId) {
      throw new ForbiddenException(
        'You can only create payments for your own tenant account',
      );
    }

    if (dto.idempotencyKey) {
      const existing = await this.paymentRepo.findOne({
        where: {
          idempotencyKey: dto.idempotencyKey,
          deletedAt: { $exists: false } as any,
        },
      });

      if (existing) {
        return this.mapPayment(existing);
      }
    }

    const tenant = await this.userRepo.findOne({
      where: { _id: this.toObjectId(dto.tenantId) as any },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const customer = await this.stripeService.createOrGetCustomer({
      email: tenant.email,
      name: `${tenant.firstName} ${tenant.lastName}`.trim(),
      metadata: {
        tenantId: dto.tenantId,
        leaseId: dto.leaseId,
      },
    });

    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: dto.amount,
      currency: dto.currency || 'TND',
      customerId: customer.id,
      description: dto.description || `Lease payment ${dto.leaseId}`,
      metadata: {
        leaseId: dto.leaseId,
        tenantId: dto.tenantId,
        ownerId: lease.ownerId,
        type: dto.type,
      },
      idempotencyKey: dto.idempotencyKey,
    });

    const payment = this.paymentRepo.create({
      leaseId: dto.leaseId,
      tenantId: dto.tenantId,
      ownerId: lease.ownerId,
      agencyId: lease.managerId,
      amount: dto.amount,
      currency: dto.currency || 'TND',
      type: dto.type,
      method: dto.method,
      status:
        paymentIntent.status === 'succeeded'
          ? PaymentStatus.COMPLETED
          : PaymentStatus.PENDING,
      description: dto.description,
      invoiceId: dto.invoiceId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customer.id,
      transactionId: paymentIntent.latest_charge || undefined,
      gatewayRefId: paymentIntent.id,
      gatewayResponse: {
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
      },
      idempotencyKey: dto.idempotencyKey,
      dueDate: new Date(),
      paidAt: paymentIntent.status === 'succeeded' ? new Date() : undefined,
      createdBy: userId,
      ipAddress,
      userAgent,
    });

    const saved = await this.paymentRepo.save(payment);

    return {
      ...this.mapPayment(saved),
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      // Backward-compat: frontend expects `clientSecret`
      clientSecret: paymentIntent.client_secret,
      stripePublishableKey: this.stripeService.getPublishableKey(),
    };
  }

  async confirmPayment(
    id: string,
    userId: string,
    role: UserRole,
    paymentIntentId?: string,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: {
        _id: this.toObjectId(id) as any,
        deletedAt: null,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!this.canAccessPayment(payment, userId, role)) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    if (paymentIntentId && payment.stripePaymentIntentId !== paymentIntentId) {
      throw new BadRequestException('Payment intent does not match payment');
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('This payment has no Stripe reference');
    }

    const paymentIntent = await this.stripeService.getPaymentIntent(
      payment.stripePaymentIntentId,
    );

    if (
      paymentIntent.status === 'succeeded' ||
      paymentIntent.status === 'processing'
    ) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      payment.transactionId =
        paymentIntent.latest_charge || payment.transactionId;
      payment.gatewayResponse = {
        ...(payment.gatewayResponse || {}),
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
      };
      payment.updatedBy = userId;
      const saved = await this.paymentRepo.save(payment);
      return this.mapPayment(saved);
    }

    payment.status = PaymentStatus.PENDING;
    payment.gatewayResponse = {
      ...(payment.gatewayResponse || {}),
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret,
    };
    payment.updatedBy = userId;
    const saved = await this.paymentRepo.save(payment);
    return this.mapPayment(saved);
  }

  async getMine(userId: string, role: UserRole, query: PaymentQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {
      deletedAt: null,
    };

    if (role === UserRole.TENANT) {
      filter.tenantId = userId;
    } else if (
      [
        UserRole.OWNER,
        UserRole.BRANCH_MANAGER,
        UserRole.REAL_ESTATE_AGENT,
        UserRole.RENTAL_MANAGER,
        UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
      ].includes(role)
    ) {
      filter.$or = [{ ownerId: userId }, { createdBy: userId }];
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.leaseId) {
      filter.leaseId = query.leaseId;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const [rows, total] = await Promise.all([
      this.paymentRepo.find({
        where: filter,
        skip,
        take: limit,
        order: { [sortBy]: sortOrder } as any,
      }),
      this.paymentRepo.countDocuments(filter),
    ]);

    return {
      data: rows.map((row) => this.mapPayment(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string, userId: string, role: UserRole) {
    const payment = await this.paymentRepo.findOne({
      where: {
        _id: this.toObjectId(id) as any,
        deletedAt: null,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!this.canAccessPayment(payment, userId, role)) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    return this.mapPayment(payment);
  }

  async refundPayment(
    id: string,
    userId: string,
    role: UserRole,
    amount?: number,
    reason?: string,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: {
        _id: this.toObjectId(id) as any,
        deletedAt: null,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const refundRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.BRANCH_MANAGER,
      UserRole.REAL_ESTATE_AGENT,
      UserRole.RENTAL_MANAGER,
      UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
    ];

    if (!refundRoles.includes(role)) {
      throw new ForbiddenException('You are not allowed to refund payments');
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('This payment has no Stripe reference');
    }

    const refund = await this.stripeService.refundPayment({
      paymentIntentId: payment.stripePaymentIntentId,
      amount,
      reason,
    });

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAmount = amount || payment.amount;
    payment.refundedAt = new Date();
    payment.refundedBy = userId;
    payment.refundReason = reason;
    payment.updatedBy = userId;
    payment.gatewayResponse = {
      ...(payment.gatewayResponse || {}),
      refundId: refund.id,
      refundStatus: refund.status,
    };

    const saved = await this.paymentRepo.save(payment);
    return this.mapPayment(saved);
  }

  async getSummary(
    userId: string,
    role: UserRole,
    query: PaymentQueryDto,
  ): Promise<PaymentSummaryDto> {
    const history = await this.getMine(userId, role, {
      ...query,
      page: 1,
      limit: 1000,
    });

    const data = history.data;

    const totalAmount = data.reduce((acc, p) => acc + p.amount, 0);
    const completedAmount = data
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((acc, p) => acc + p.amount, 0);
    const pendingAmount = data
      .filter(
        (p) =>
          p.status === PaymentStatus.PENDING ||
          p.status === PaymentStatus.PROCESSING,
      )
      .reduce((acc, p) => acc + p.amount, 0);
    const failedAmount = data
      .filter((p) => p.status === PaymentStatus.FAILED)
      .reduce((acc, p) => acc + p.amount, 0);
    const refundedAmount = data
      .filter((p) => p.status === PaymentStatus.REFUNDED)
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      totalAmount,
      completedAmount,
      pendingAmount,
      failedAmount,
      refundedAmount,
      paymentCount: data.length,
      completedCount: data.filter((p) => p.status === PaymentStatus.COMPLETED)
        .length,
      failedCount: data.filter((p) => p.status === PaymentStatus.FAILED).length,
      refundedCount: data.filter((p) => p.status === PaymentStatus.REFUNDED)
        .length,
      averageAmount: data.length ? Math.round(totalAmount / data.length) : 0,
    };
  }

  async exportMine(
    userId: string,
    role: UserRole,
    query: ExportPaymentQueryDto,
  ): Promise<string> {
    const result = await this.getMine(userId, role, {
      ...query,
      page: 1,
      limit: 5000,
    });

    const header = [
      'id',
      'leaseId',
      'tenantId',
      'ownerId',
      'amount',
      'currency',
      'type',
      'status',
      'method',
      'dueDate',
      'paidAt',
      'description',
      'createdAt',
    ];

    const rows = result.data.map((p) => [
      p.id,
      p.leaseId,
      p.tenantId,
      p.ownerId,
      p.amount,
      p.currency,
      p.type,
      p.status,
      p.method || '',
      p.dueDate,
      p.paidAt || '',
      (p.description || '').replace(/,/g, ' '),
      p.createdAt,
    ]);

    return [header, ...rows].map((r) => r.join(',')).join('\n');
  }

  async clearMine(
    userId: string,
    role: UserRole,
  ): Promise<{ clearedCount: number }> {
    const filter: any = {
      deletedAt: null,
    };

    if (role === UserRole.TENANT) {
      filter.tenantId = userId;
    } else if (
      [
        UserRole.OWNER,
        UserRole.BRANCH_MANAGER,
        UserRole.REAL_ESTATE_AGENT,
        UserRole.RENTAL_MANAGER,
        UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
      ].includes(role)
    ) {
      filter.$or = [{ ownerId: userId }, { createdBy: userId }];
    } else {
      filter.createdBy = userId;
    }

    const items = await this.paymentRepo.find({ where: filter });

    if (!items || items.length === 0) {
      return { clearedCount: 0 };
    }

    const now = new Date();
    const toSave = items.map((p) => {
      p.deletedAt = now as any;
      p.updatedBy = userId;
      return p;
    });

    await this.paymentRepo.save(toSave as any[]);

    return { clearedCount: toSave.length };
  }

  async clearOne(
    id: string,
    userId: string,
    role: UserRole,
  ): Promise<{ deleted: boolean }> {
    const payment = await this.paymentRepo.findOne({
      where: { _id: this.toObjectId(id) as any, deletedAt: null },
    });

    if (!payment) {
      return { deleted: false };
    }

    if (!this.canAccessPayment(payment, userId, role)) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    payment.deletedAt = new Date() as any;
    payment.updatedBy = userId;
    await this.paymentRepo.save(payment);

    return { deleted: true };
  }
}
