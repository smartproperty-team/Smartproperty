import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { APPLICATION_REVIEW_ROLES } from '../users/role-groups';
import {
  AssignMaintenanceRequestDto,
  CreateMaintenanceRequestDto,
  RecordMaintenanceOutcomeDto,
  SubmitServiceReportDto,
  UpdateMaintenanceStatusDto,
  UpdateProviderMaintenanceStatusDto,
} from './dto/maintenance-request.dto';
import { MaintenanceService } from './maintenance.service';

const MAINTENANCE_INTAKE_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
];

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance/requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles(...MAINTENANCE_INTAKE_ROLES)
  @ApiOperation({ summary: 'Create maintenance request or save draft' })
  @ApiResponse({ status: 201, description: 'Maintenance request created' })
  createRequest(
    @Body() dto: CreateMaintenanceRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.maintenanceService.createRequest(dto, userId, role);
  }

  @Get('mine')
  @Roles(...MAINTENANCE_INTAKE_ROLES)
  @ApiOperation({
    summary: 'List maintenance requests created by current user',
  })
  findMine(@CurrentUser('id') userId: string) {
    return this.maintenanceService.findMine(userId);
  }

  @Get('assigned')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({
    summary: 'List maintenance requests assigned to current service provider',
  })
  findAssigned(@CurrentUser('id') userId: string) {
    return this.maintenanceService.findAssignedToProvider(userId);
  }

  @Get('available')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({
    summary: 'List open maintenance requests available to claim by providers',
  })
  findAvailable() {
    return this.maintenanceService.findAvailableForProvider();
  }

  @Patch(':id/assign')
  @Roles(...APPLICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Assign maintenance request and set schedule/SLA' })
  assignRequest(
    @Param('id') id: string,
    @Body() dto: AssignMaintenanceRequestDto,
  ) {
    return this.maintenanceService.assignRequest(id, dto);
  }

  @Patch(':id/status')
  @Roles(...APPLICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Update maintenance request status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceStatusDto,
  ) {
    return this.maintenanceService.updateStatus(id, dto);
  }

  @Patch(':id/outcome')
  @Roles(...APPLICATION_REVIEW_ROLES)
  @ApiOperation({
    summary: 'Record maintenance costs and resolution/close data',
  })
  recordOutcome(
    @Param('id') id: string,
    @Body() dto: RecordMaintenanceOutcomeDto,
  ) {
    return this.maintenanceService.recordOutcome(id, dto);
  }

  @Patch(':id/service-report')
  @Roles(UserRole.SERVICE_PROVIDER, ...APPLICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Submit service provider intervention report' })
  submitServiceReport(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: SubmitServiceReportDto,
  ) {
    return this.maintenanceService.submitServiceReport(id, dto, userId, role);
  }

  @Patch(':id/provider-status')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Update assigned maintenance status as provider' })
  updateProviderStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProviderMaintenanceStatusDto,
  ) {
    return this.maintenanceService.updateProviderStatus(id, userId, dto);
  }

  @Patch(':id/claim')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Claim an open maintenance request' })
  claimRequest(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.maintenanceService.claimRequest(id, userId);
  }
}
