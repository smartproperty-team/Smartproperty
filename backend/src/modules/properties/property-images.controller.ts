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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
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
  constructor(private readonly propertyImagesService: PropertyImagesService) {}

  // ===========================================
  // Upload Images
  // ===========================================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.AGENT)
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
  ) {
    return this.propertyImagesService.uploadImages(
      propertyId,
      files,
      userId,
      userRole,
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
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
}
