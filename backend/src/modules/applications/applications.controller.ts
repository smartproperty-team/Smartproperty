// ===========================================
// SmartProperty - Applications Controller
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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  APPLICATION_REVIEW_ROLES,
  TENANT_ONLY_ROLES,
} from '../users/role-groups';
import { ApplicationsService } from './applications.service';
import {
  ListApplicationsQueryDto,
  RejectApplicationDto,
  RequestAdditionalDocumentsDto,
  ScheduleViewingDto,
  SubmitApplicationDto,
  UploadApplicationDocumentDto,
  WithdrawApplicationDto,
} from './dto/application.dto';
import { ApplicationStatus } from './entities/application.entity';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({ summary: 'Submit rental application (tenant)' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  async submitApplication(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    const app = await this.applicationsService.submitApplication(userId, dto);
    return app.toJSON();
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload application document' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', example: 'income_proof' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadApplicationDocumentDto,
  ) {
    const app = await this.applicationsService.uploadDocument(
      id,
      userId,
      role,
      file,
      body.category,
    );

    return app.toJSON();
  }

  @Get('my')
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({ summary: 'View current tenant applications' })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationStatus })
  @ApiQuery({ name: 'propertyId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyApplications(
    @CurrentUser('id') userId: string,
    @Query() query: ListApplicationsQueryDto,
  ) {
    return this.applicationsService.getMyApplications(userId, query);
  }

  @Get('history')
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({ summary: 'View tenant application history' })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationStatus })
  @ApiQuery({ name: 'propertyId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyApplicationHistory(
    @CurrentUser('id') userId: string,
    @Query() query: ListApplicationsQueryDto,
  ) {
    return this.applicationsService.getMyApplications(userId, query);
  }

  @Patch(':id/withdraw')
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({ summary: 'Withdraw application (tenant)' })
  async withdrawApplication(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: WithdrawApplicationDto,
  ) {
    const app = await this.applicationsService.withdrawApplication(
      id,
      userId,
      dto.reason,
    );
    return app.toJSON();
  }

  @Get('received')
  @Roles(...APPLICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'View applications received by owner/manager' })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationStatus })
  @ApiQuery({ name: 'propertyId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getReceivedApplications(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: ListApplicationsQueryDto,
  ) {
    return this.applicationsService.getReceivedApplications(
      userId,
      role,
      query,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Review application details' })
  async getApplicationDetails(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const app = await this.applicationsService.getApplicationDetails(
      id,
      userId,
      role,
    );

    return app.toJSON();
  }

  @Patch(':id/request-documents')
  @Roles(...APPLICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Request additional documents from tenant' })
  async requestAdditionalDocuments(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: RequestAdditionalDocumentsDto,
  ) {
    const app = await this.applicationsService.requestAdditionalDocuments(
      id,
      userId,
      role,
      dto,
    );

    return app.toJSON();
  }

  @Patch(':id/approve')
  @Roles(...APPLICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Approve application' })
  async approveApplication(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const app = await this.applicationsService.approveApplication(
      id,
      userId,
      role,
    );
    return app.toJSON();
  }

  @Patch(':id/reject')
  @Roles(...APPLICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Reject application with reason' })
  async rejectApplication(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: RejectApplicationDto,
  ) {
    const app = await this.applicationsService.rejectApplication(
      id,
      userId,
      role,
      dto.reason,
    );

    return app.toJSON();
  }

  @Patch(':id/schedule-viewing')
  @Roles(...APPLICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Schedule property viewing for application' })
  async scheduleViewing(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: ScheduleViewingDto,
  ) {
    const app = await this.applicationsService.scheduleViewing(
      id,
      userId,
      role,
      dto,
    );

    return app.toJSON();
  }

  @Post('admin/deadline-reminders')
  @Roles(...APPLICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Trigger application deadline reminders manually' })
  async triggerDeadlineReminders() {
    return this.applicationsService.triggerDeadlineReminders();
  }
}
