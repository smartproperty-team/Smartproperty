// ===========================================
// SmartProperty - Properties Controller
// ===========================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  PROPERTY_CREATOR_ROLES,
  PROPERTY_MANAGEMENT_ROLES,
} from '../users/role-groups';
import {
  PortfolioConnectorSyncDto,
  PortfolioExportQueryDto,
  PortfolioImportCommitDto,
  PortfolioSummaryQueryDto,
} from './dto/portfolio.dto';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import {
  PropertyCategory,
  PropertyStatus,
  PropertyType,
} from './entities/property.entity';
import type { FindPropertiesOptions } from './properties.service';
import { PropertiesService } from './properties.service';

// ===========================================
// Properties Controller
// ===========================================

@ApiTags('Properties')
@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly configService: ConfigService,
  ) {}

  // ===========================================
  // List Properties (Public)
  // ===========================================

  @Public()
  @Get()
  @ApiOperation({ summary: 'List properties' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: PropertyType })
  @ApiQuery({ name: 'status', required: false, enum: PropertyStatus })
  @ApiQuery({ name: 'category', required: false, enum: PropertyCategory })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'managerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of properties' })
  async findAll(@Query() options: FindPropertiesOptions) {
    return this.propertiesService.findAll(options);
  }

  // ===========================================
  // Portfolio Summary and Data Exchange
  // ===========================================

  @Get('portfolio/summary')
  @Roles(...PROPERTY_MANAGEMENT_ROLES, UserRole.ACCOUNTANT_ADMIN_ASSISTANT)
  @ApiOperation({ summary: 'Get portfolio KPI summary' })
  @ApiResponse({ status: 200, description: 'Portfolio summary payload' })
  async getPortfolioSummary(
    @Query() filters: PortfolioSummaryQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.propertiesService.getPortfolioSummary(userId, role, filters);
  }

  @Get('portfolio/export')
  @Roles(...PROPERTY_MANAGEMENT_ROLES, UserRole.ACCOUNTANT_ADMIN_ASSISTANT)
  @ApiOperation({ summary: 'Export portfolio data as CSV payload' })
  @ApiResponse({ status: 200, description: 'CSV export payload' })
  async exportPortfolio(
    @Query() filters: PortfolioExportQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.propertiesService.exportPortfolioCsv(userId, role, filters);
  }

  @Get('portfolio/export/excel')
  @Roles(...PROPERTY_MANAGEMENT_ROLES, UserRole.ACCOUNTANT_ADMIN_ASSISTANT)
  @ApiOperation({ summary: 'Export portfolio data as Excel payload' })
  @ApiResponse({ status: 200, description: 'Excel export payload' })
  async exportPortfolioExcel(
    @Query() filters: PortfolioExportQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.propertiesService.exportPortfolioExcel(userId, role, filters);
  }

  @Get('portfolio/template/excel')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Download portfolio Excel import template payload' })
  @ApiResponse({ status: 200, description: 'Excel template payload' })
  getPortfolioTemplateExcel() {
    return this.propertiesService.getPortfolioImportTemplateExcel();
  }

  @Post('portfolio/import/preview')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Preview portfolio CSV/Excel import and validation report',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or XLSX file to preview',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Import preview generated' })
  async previewPortfolioImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.propertiesService.previewPortfolioImportFile(
      file?.buffer || Buffer.from(''),
      file?.originalname,
      file?.mimetype,
      role,
    );
  }

  @Post('portfolio/import/commit')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Commit validated portfolio import rows' })
  @ApiResponse({ status: 201, description: 'Import rows committed' })
  async commitPortfolioImport(
    @Body() body: PortfolioImportCommitDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.propertiesService.commitPortfolioImportRows(
      body.rows,
      userId,
      role,
      body.skipDuplicates,
    );
  }

  @Get('portfolio/connectors')
  @Roles(...PROPERTY_MANAGEMENT_ROLES, UserRole.ACCOUNTANT_ADMIN_ASSISTANT)
  @ApiOperation({ summary: 'List available partner connectors' })
  @ApiResponse({ status: 200, description: 'Connector catalog' })
  getPortfolioConnectors() {
    return this.propertiesService.getPortfolioConnectors();
  }

  @Post('portfolio/connectors/sync')
  @Roles(...PROPERTY_MANAGEMENT_ROLES, UserRole.ACCOUNTANT_ADMIN_ASSISTANT)
  @ApiOperation({ summary: 'Sync portfolio data to a partner connector' })
  @ApiResponse({ status: 201, description: 'Sync execution result' })
  async syncPortfolioConnector(
    @Body() body: PortfolioConnectorSyncDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.propertiesService.syncPortfolioConnector(userId, role, body);
  }

  // ===========================================
  // Get Property (Public)
  // ===========================================

  @Public()
  @Get(':id/share')
  @ApiOperation({ summary: 'Get property share link and QR code' })
  @ApiResponse({ status: 200, description: 'Property share payload' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getShareData(@Param('id') id: string) {
    const property = await this.propertiesService.findById(id);

    const corsOrigin = this.configService.get<string>('app.corsOrigin') || '';
    const frontendBaseUrl =
      corsOrigin
        .split(',')
        .map((value) => value.trim())
        .find((value) => value && value !== '*')
        ?.replace(/\/$/, '') || 'http://localhost:5173';

    const shareUrl = `${frontendBaseUrl}/properties/${property.id}`;
    const qrCode = await this.propertiesService.generateShareQRCode(shareUrl);

    return {
      shareUrl,
      qrCode,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  @ApiResponse({ status: 200, description: 'Property data' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findOne(@Param('id') id: string) {
    const property = await this.propertiesService.findById(id);
    return property.toJSON();
  }

  // ===========================================
  // Create Property
  // ===========================================

  @Post()
  @Roles(...PROPERTY_CREATOR_ROLES)
  @ApiOperation({ summary: 'Create a property' })
  @ApiResponse({ status: 201, description: 'Property created' })
  async create(
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const property = await this.propertiesService.create(
      createPropertyDto,
      userId,
      role,
    );

    return property.toJSON();
  }

  // ===========================================
  // Update Property
  // ===========================================

  @Put(':id')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Update a property' })
  @ApiResponse({ status: 200, description: 'Property updated' })
  async update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const property = await this.propertiesService.update(
      id,
      updatePropertyDto,
      userId,
      role,
    );

    return property.toJSON();
  }

  // ===========================================
  // Delete Property (Soft delete)
  // ===========================================

  @Delete(':id')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a property (soft delete)' })
  @ApiResponse({ status: 204, description: 'Property deleted' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    await this.propertiesService.remove(id, userId, role);
  }
}
