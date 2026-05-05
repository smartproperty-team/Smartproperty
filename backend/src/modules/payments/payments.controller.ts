import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  CreatePaymentDto,
  ExportPaymentQueryDto,
  PaymentQueryDto,
} from './dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @Roles(
    UserRole.TENANT,
    UserRole.OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.REAL_ESTATE_AGENT,
    UserRole.RENTAL_MANAGER,
    UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Create payment and Stripe payment intent' })
  initiate(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.paymentsService.initiatePayment(
      dto,
      userId,
      role,
      ipAddress,
      userAgent,
    );
  }

  @Post(':id/confirm')
  @Roles(
    UserRole.TENANT,
    UserRole.OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.REAL_ESTATE_AGENT,
    UserRole.RENTAL_MANAGER,
    UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Confirm payment after Stripe success' })
  @ApiParam({ name: 'id', description: 'Payment id' })
  confirm(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body('paymentIntentId') paymentIntentId: string,
  ) {
    return this.paymentsService.confirmPayment(
      id,
      userId,
      role,
      paymentIntentId,
    );
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get payment history for the current user' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'leaseId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMine(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: PaymentQueryDto,
  ) {
    return this.paymentsService.getMine(userId, role, query);
  }

  @Get('mine/summary')
  @ApiOperation({ summary: 'Get summary metrics for current user payments' })
  getSummary(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: PaymentQueryDto,
  ) {
    return this.paymentsService.getSummary(userId, role, query);
  }

  @Post('mine/clear')
  @ApiOperation({
    summary: 'Clear (soft-delete) payment history for current user',
  })
  clearMine(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.paymentsService.clearMine(userId, role);
  }

  @Get('mine/export')
  @ApiOperation({
    summary: 'Export current user payment history as CSV/Excel-compatible CSV',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  exportMine(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: ExportPaymentQueryDto,
  ) {
    return this.paymentsService.exportMine(userId, role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details by id' })
  @ApiParam({ name: 'id', description: 'Payment id' })
  getById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.paymentsService.getById(id, userId, role);
  }

  @Post(':id/refund')
  @Roles(
    UserRole.OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.REAL_ESTATE_AGENT,
    UserRole.RENTAL_MANAGER,
    UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Refund payment through Stripe' })
  refund(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(
      id,
      userId,
      role,
      dto.amount,
      dto.reason,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (soft) a payment by id' })
  @ApiParam({ name: 'id', description: 'Payment id' })
  deleteOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.paymentsService.clearOne(id, userId, role);
  }
}
