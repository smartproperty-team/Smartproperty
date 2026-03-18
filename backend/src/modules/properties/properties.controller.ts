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
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
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
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import { PropertyStatus, PropertyType } from './entities/property.entity';
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
  @Roles(UserRole.OWNER)
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.AGENT)
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.AGENT)
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
