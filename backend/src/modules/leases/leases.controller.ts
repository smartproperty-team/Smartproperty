// ===========================================
// SmartProperty - Leases Controller
// ===========================================

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  LEASE_MANAGEMENT_ROLES,
  LEASE_PARTICIPANT_ROLES,
  PLATFORM_ADMIN_ROLES,
} from '../users/role-groups';
import {
  CreateLeaseFromApplicationDto,
  LeaseDepositDto,
  LeaseInventoryDto,
  LeaseListQueryDto,
  LeaseOwnerDecisionDto,
  LeaseRenewalDto,
  LeaseSignatureDto,
  LeaseTerminationDto,
  UploadLeaseDocumentDto,
} from './dto/lease.dto';
import {
  LeaseDocumentType,
  LeaseInventoryPhase,
  LeaseStatus,
} from './entities/lease.entity';
import { LeasesService } from './leases.service';

@ApiTags('Leases')
@ApiBearerAuth()
@Controller('leases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post('from-application/:applicationId')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Create lease from an approved application' })
  createFromApplication(
    @Param('applicationId') applicationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateLeaseFromApplicationDto,
  ) {
    return this.leasesService.createFromApprovedApplication(
      applicationId,
      userId,
      role,
      dto,
    );
  }

  @Get('mine')
  @Roles(...LEASE_PARTICIPANT_ROLES)
  @ApiOperation({ summary: 'List leases visible to the current user' })
  @ApiQuery({ name: 'status', required: false, enum: LeaseStatus })
  @ApiQuery({ name: 'propertyId', required: false, type: String })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMine(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: LeaseListQueryDto,
  ) {
    return this.leasesService.getMine(userId, role, query);
  }

  @Get('managed')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'List leases managed by the current user' })
  @ApiQuery({ name: 'status', required: false, enum: LeaseStatus })
  @ApiQuery({ name: 'propertyId', required: false, type: String })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getManaged(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: LeaseListQueryDto,
  ) {
    return this.leasesService.getManaged(userId, role, query);
  }

  @Get('reports/expiring')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Lease expiration report' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getExpiringLeases(@Query('days') days?: string) {
    return this.leasesService.getExpiringLeases(days ? Number(days) : 90);
  }

  @Get('reports/occupancy')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Occupancy report' })
  getOccupancyReport() {
    return this.leasesService.getOccupancyReport();
  }

  @Get('reports/revenue')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Revenue projection report' })
  getRevenueProjection() {
    return this.leasesService.getRevenueProjection();
  }

  @Post('admin/reminders')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Trigger lease renewal reminders manually' })
  triggerReminders() {
    return this.leasesService.triggerRenewalReminders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'View lease details' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  getLeaseDetails(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.leasesService.getLeaseDetails(id, userId, role);
  }

  @Patch(':id/owner-decision')
  @Roles(UserRole.OWNER, ...PLATFORM_ADMIN_ROLES)
  @ApiOperation({
    summary: 'Approve or reject lease terms as owner or admin',
  })
  reviewOwnerDecision(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: LeaseOwnerDecisionDto,
  ) {
    return this.leasesService.reviewOwnerDecision(id, userId, role, dto);
  }

  @Post(':id/documents')
  @Roles(...LEASE_PARTICIPANT_ROLES)
  @ApiOperation({ summary: 'Upload a lease document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: Object.values(LeaseDocumentType) },
        description: { type: 'string' },
      },
      required: ['file', 'type'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadLeaseDocumentDto,
  ) {
    return this.leasesService.uploadLeaseDocument(id, userId, role, file, dto);
  }

  @Post(':id/endorsements')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Upload an endorsement or addendum' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadEndorsement(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadLeaseDocumentDto,
  ) {
    return this.leasesService.addEndorsement(id, userId, role, file, dto);
  }

  @Patch(':id/sign')
  @Roles(...LEASE_PARTICIPANT_ROLES)
  @ApiOperation({ summary: 'Record a digital signature for the lease' })
  signLease(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: LeaseSignatureDto,
  ) {
    return this.leasesService.signLease(id, userId, role, dto);
  }

  @Patch(':id/activate')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Activate a signed lease' })
  activateLease(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.leasesService.activateLease(id, userId, role);
  }

  @Post(':id/inventory')
  @Roles(...LEASE_PARTICIPANT_ROLES)
  @ApiOperation({
    summary: 'Record a move-in or move-out inventory with photos',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phase: { type: 'string', enum: Object.values(LeaseInventoryPhase) },
        room: { type: 'string' },
        item: { type: 'string' },
        condition: { type: 'string' },
        notes: { type: 'string' },
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['phase', 'item', 'condition', 'photos'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  recordInventory(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: LeaseInventoryDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.leasesService.recordInventory(id, userId, role, dto, files);
  }

  @Patch(':id/renew')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Renew an active lease' })
  renewLease(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: LeaseRenewalDto,
  ) {
    return this.leasesService.renewLease(id, userId, role, dto);
  }

  @Patch(':id/terminate')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Terminate a lease' })
  terminateLease(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: LeaseTerminationDto,
  ) {
    return this.leasesService.terminateLease(id, userId, role, dto);
  }

  @Patch(':id/security-deposit')
  @Roles(...LEASE_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Update security deposit handling' })
  updateSecurityDeposit(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: LeaseDepositDto,
  ) {
    return this.leasesService.updateDeposit(id, userId, role, dto);
  }
}
