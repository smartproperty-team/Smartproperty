// ===========================================
// SmartProperty - Property Images Controller
// ===========================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  PROPERTY_MANAGEMENT_ROLES,
  PROPERTY_MEDIA_UPLOAD_ROLES,
} from '../users/role-groups';
import { VirtualTourConfigDto } from './dto/property.dto';
import { AiStagingService } from './ai-staging.service';
import {
  PropertyImage,
  PropertyImagesService,
} from './property-images.service';

// ===========================================
// DTOs
// ===========================================

class UpdateCaptionDto {
  caption: string;
}

class ReorderImagesDto {
  imageKeys: string[];
}

class SetPrimaryImageDto {
  imageKey: string;
}

// ===========================================
// Controller
// ===========================================

@ApiTags('Property Images')
@Controller('properties/:propertyId/images')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PropertyImagesController {
  constructor(
    private readonly propertyImagesService: PropertyImagesService,
    private readonly aiStagingService: AiStagingService,
  ) {}

  // ===========================================
  // Upload Images
  // ===========================================

  @Post()
  @Roles(...PROPERTY_MEDIA_UPLOAD_ROLES)
  @UseInterceptors(FilesInterceptor('images', 20))
  @ApiOperation({ summary: 'Upload images for a property' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Images to upload (max 20, max 10MB each)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no permission' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async uploadImages(
    @Param('propertyId') propertyId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Body('generateVirtualTour') generateVirtualTour?: string | boolean,
  ) {
    const shouldGenerateVirtualTour =
      generateVirtualTour === true ||
      generateVirtualTour === 'true' ||
      generateVirtualTour === '1';

    return this.propertyImagesService.uploadImages(
      propertyId,
      files,
      userId,
      userRole,
      shouldGenerateVirtualTour,
    );
  }

  // ===========================================
  // Get Images
  // ===========================================

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all images for a property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'List of property images',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getImages(
    @Param('propertyId') propertyId: string,
  ): Promise<PropertyImage[]> {
    return this.propertyImagesService.getImages(propertyId);
  }

  // ===========================================
  // Get Primary Image
  // ===========================================

  @Public()
  @Get('primary')
  @ApiOperation({ summary: 'Get primary image for a property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Primary image',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getPrimaryImage(
    @Param('propertyId') propertyId: string,
  ): Promise<PropertyImage | null> {
    return this.propertyImagesService.getPrimaryImage(propertyId);
  }

  // ===========================================
  // Set Primary Image
  // ===========================================

  @Patch('primary')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Set primary image for a property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiBody({ type: SetPrimaryImageDto })
  @ApiResponse({
    status: 200,
    description: 'Primary image updated',
  })
  @ApiResponse({ status: 400, description: 'Property has no images' })
  @ApiResponse({ status: 404, description: 'Property or image not found' })
  async setPrimaryImage(
    @Param('propertyId') propertyId: string,
    @Body() body: SetPrimaryImageDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.propertyImagesService.setPrimaryImage(
      propertyId,
      body.imageKey,
      userId,
      userRole,
    );
  }

  // ===========================================
  // Update Caption
  // ===========================================

  @Patch(':imageKey/caption')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Update image caption' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiParam({ name: 'imageKey', description: 'Image key (URL-encoded)' })
  @ApiBody({ type: UpdateCaptionDto })
  @ApiResponse({
    status: 200,
    description: 'Caption updated',
  })
  @ApiResponse({ status: 404, description: 'Property or image not found' })
  async updateCaption(
    @Param('propertyId') propertyId: string,
    @Param('imageKey') imageKey: string,
    @Body() body: UpdateCaptionDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    const decodedKey = decodeURIComponent(imageKey);
    return this.propertyImagesService.updateImageCaption(
      propertyId,
      decodedKey,
      body.caption,
      userId,
      userRole,
    );
  }

  // ===========================================
  // Reorder Images
  // ===========================================

  @Patch('reorder')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Reorder property images' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiBody({ type: ReorderImagesDto })
  @ApiResponse({
    status: 200,
    description: 'Images reordered',
  })
  @ApiResponse({ status: 400, description: 'Invalid image keys' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async reorderImages(
    @Param('propertyId') propertyId: string,
    @Body() body: ReorderImagesDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.propertyImagesService.reorderImages(
      propertyId,
      body.imageKeys,
      userId,
      userRole,
    );
  }

  // ===========================================
  // Delete Image
  // ===========================================

  @Delete(':imageKey')
  @HttpCode(HttpStatus.OK)
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Delete a specific image' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiParam({ name: 'imageKey', description: 'Image key (URL-encoded)' })
  @ApiResponse({
    status: 200,
    description: 'Image deleted',
  })
  @ApiResponse({ status: 404, description: 'Property or image not found' })
  async deleteImage(
    @Param('propertyId') propertyId: string,
    @Param('imageKey') imageKey: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    const decodedKey = decodeURIComponent(imageKey);
    return this.propertyImagesService.deleteImage(
      propertyId,
      decodedKey,
      userId,
      userRole,
    );
  }

  // ===========================================
  // Delete All Images
  // ===========================================

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Delete all images' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'All images deleted',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async deleteAllImages(
    @Param('propertyId') propertyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.propertyImagesService.deleteAllImages(
      propertyId,
      userId,
      userRole,
    );
  }

  // ===========================================
  // Get Virtual Tour Panorama
  // ===========================================

  @Get('virtual-tour/panorama')
  @Public()
  @ApiOperation({ summary: 'Get virtual tour panorama image (public)' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Panorama image stream',
    content: { 'image/jpeg': {} },
  })
  @ApiResponse({ status: 404, description: 'Property or panorama not found' })
  async getPanorama(
    @Param('propertyId') propertyId: string,
    @Res() res: Response,
  ) {
    const imageStream =
      await this.propertyImagesService.getPanorama(propertyId);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
    imageStream.pipe(res);
  }

  @Post('virtual-tour/generate')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Trigger virtual tour generation for a property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiBody({
    schema: { type: 'object', properties: { processNow: { type: 'boolean' } } },
  })
  @ApiResponse({ status: 200, description: 'Generation job queued' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async generateVirtualTour(
    @Param('propertyId') propertyId: string,
    @Body('processNow') processNow: boolean,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.propertyImagesService.triggerVirtualTourGeneration(
      propertyId,
      userId,
      userRole,
      Boolean(processNow),
    );
  }

  // ===========================================
  // Virtual Tour Status
  // ===========================================

  @Get('virtual-tour/status')
  @Public()
  @ApiOperation({ summary: 'Get virtual tour job status for a property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({ status: 200, description: 'Virtual tour job status' })
  @ApiResponse({ status: 404, description: 'No virtual tour job found' })
  async getVirtualTourStatus(@Param('propertyId') propertyId: string) {
    return this.propertyImagesService.getVirtualTourStatus(propertyId);
  }

  // ===========================================
  // Virtual Tour Config (Hotspots)
  // ===========================================

  @Put('virtual-tour-config')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Save virtual tour hotspot configuration' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiBody({ type: VirtualTourConfigDto })
  @ApiResponse({ status: 200, description: 'Virtual tour config saved' })
  @ApiResponse({ status: 400, description: 'Invalid config or room keys' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async updateVirtualTourConfig(
    @Param('propertyId') propertyId: string,
    @Body() config: VirtualTourConfigDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.propertyImagesService.updateVirtualTourConfig(
      propertyId,
      config,
      userId,
      userRole,
    );
  }

  // ===========================================
  // AI Virtual Staging
  // ===========================================

  @Get('staging/styles')
  @Public()
  @ApiOperation({ summary: 'Get available virtual staging styles' })
  @ApiResponse({ status: 200, description: 'List of staging styles' })
  async getStagingStyles() {
    return this.aiStagingService.getStyles();
  }

  @Post('staging/generate')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Request AI virtual staging for a room image' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'URL of the room image' },
        style: { type: 'string', description: 'Staging style ID' },
        roomType: { type: 'string', description: 'Room type (optional)' },
        strength: {
          type: 'number',
          description: 'Change intensity 0.1-0.8 (optional)',
        },
      },
      required: ['imageUrl', 'style'],
    },
  })
  @ApiResponse({ status: 202, description: 'Staging job created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async requestStaging(
    @Param('propertyId') propertyId: string,
    @Body()
    body: {
      imageUrl: string;
      style: string;
      roomType?: string;
      strength?: number;
    },
  ) {
    return this.aiStagingService.requestStaging({
      image_url: body.imageUrl,
      style: body.style,
      room_type: body.roomType,
      strength: body.strength,
      property_id: propertyId,
    });
  }

  @Get('staging/jobs/:jobId')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Get staging job status' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiParam({ name: 'jobId', description: 'Staging job ID' })
  @ApiResponse({ status: 200, description: 'Job status' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getStagingJobStatus(@Param('jobId') jobId: string) {
    return this.aiStagingService.getJobStatus(jobId);
  }

  @Get('staging/result/:jobId')
  @Public()
  @ApiOperation({ summary: 'Get staged image result' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiParam({ name: 'jobId', description: 'Staging job ID' })
  @ApiResponse({
    status: 200,
    description: 'Staged image stream',
    content: { 'image/jpeg': {} },
  })
  @ApiResponse({ status: 404, description: 'Job or image not found' })
  async getStagedImage(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const imageStream = await this.aiStagingService.getStagedImage(jobId);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    imageStream.pipe(res);
  }
}
