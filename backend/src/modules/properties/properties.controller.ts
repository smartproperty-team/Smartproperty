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

import { randomUUID } from 'crypto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  PROPERTY_CREATOR_ROLES,
  PROPERTY_MANAGEMENT_ROLES,
  TENANT_ONLY_ROLES,
} from '../users/role-groups';
import { AiDescriptionService } from './ai-description.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiPricingService } from './ai-pricing.service';
import {
  GenerateDescriptionDto,
  GenerateDescriptionResponseDto,
} from './dto/ai-description.dto';
import {
  PortfolioConnectorSyncDto,
  PortfolioExportQueryDto,
  PortfolioImportCommitDto,
  PortfolioSummaryQueryDto,
} from './dto/portfolio.dto';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import { SuggestPriceDto } from './dto/suggest-price.dto';
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
    private readonly aiDescriptionService: AiDescriptionService,
    private readonly aiPricingService: AiPricingService,
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
  @ApiQuery({ name: 'bedrooms', required: false, type: Number })
  @ApiQuery({ name: 'bathrooms', required: false, type: Number })
  @ApiQuery({ name: 'nearLat', required: false, type: Number })
  @ApiQuery({ name: 'nearLng', required: false, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
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
  // AI Description Generation
  // (Declared BEFORE generic :id routes to avoid route capture)
  // ===========================================

  @Post('ai/descriptions/generate')
  @Roles(...PROPERTY_MANAGEMENT_ROLES, ...PROPERTY_CREATOR_ROLES)
  @ApiOperation({
    summary: 'Generate AI marketing descriptions for a property',
    description:
      'Proxies to ai-services to generate multi-variant, multilingual ' +
      'marketing descriptions. Does not persist generated text.',
  })
  @ApiResponse({ status: 200, description: 'Generated descriptions' })
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  @ApiResponse({ status: 504, description: 'AI generation timed out' })
  @HttpCode(HttpStatus.OK)
  async generateAiDescription(
    @Body() body: GenerateDescriptionDto,
    @CurrentUser('id') userId: string,
  ): Promise<GenerateDescriptionResponseDto> {
    const requestId = `${userId || 'anon'}:${randomUUID()}`;
    return this.aiDescriptionService.generateDescription(body, requestId);
  }

  @Post('ai/pricing/suggest')
  @Roles(...PROPERTY_MANAGEMENT_ROLES, ...PROPERTY_CREATOR_ROLES)
  @ApiOperation({
    summary: 'Get AI price suggestion for a Tunisian property',
    description:
      'Proxies to ai-services to predict monthly rent in TND ' +
      'based on property features and Tunisian market data.',
  })
  @ApiResponse({ status: 200, description: 'Price suggestion returned' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 504, description: 'AI service timed out' })
  @HttpCode(HttpStatus.OK)
  async suggestPrice(@Body() body: SuggestPriceDto) {
    return this.aiPricingService.suggestPrice(body);
  }

  @Get('ai/model/status')
  @Roles(...PROPERTY_MANAGEMENT_ROLES, ...PROPERTY_CREATOR_ROLES)
  @ApiOperation({ summary: 'Get AI marketing model status' })
  @ApiResponse({ status: 200, description: 'Model status payload' })
  async getAiModelStatus() {
    return this.aiDescriptionService.getModelStatus();
  }

  @Get('ai/recommendations/best-match')
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({
    summary: 'Get best property matches for the current tenant',
    description:
      'Returns preference-based property recommendations from ai-services.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Best-match recommendations' })
  @HttpCode(HttpStatus.OK)
  async getBestMatchRecommendations(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    const safeLimit =
      Number.isInteger(Number(limit)) && Number(limit) > 0
        ? Math.min(Number(limit), 20)
        : 6;

    const aiResult = await this.aiRecommendationService.getUserRecommendations(
      userId,
      safeLimit,
    );

    const hydrated = await Promise.all(
      (aiResult.recommendations || []).map(async (item) => {
        try {
          const property = await this.propertiesService.findById(
            item.property_id,
          );
          return {
            ...item,
            property: property.toJSON(),
          };
        } catch {
          return null;
        }
      }),
    );

    const recommendations = hydrated.filter(
      (entry): entry is NonNullable<typeof entry> => !!entry,
    );

    return {
      ...aiResult,
      recommendations,
      total_count: recommendations.length,
    };
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
    return this.propertiesService.findByIdView(id);
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

    return this.propertiesService.findByIdView(property.id);
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

    return this.propertiesService.findByIdView(property.id);
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
