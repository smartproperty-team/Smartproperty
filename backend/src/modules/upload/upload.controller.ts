// ===========================================
// SmartProperty - Upload Controller
// ===========================================

import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  PROPERTY_MANAGEMENT_ROLES,
  STORAGE_FILE_DELETE_ROLES,
} from '../users/role-groups';
import {
  MinioService,
  UploadedFile as UploadedFileResult,
} from './minio.service';

// ===========================================
// DTOs
// ===========================================

class UploadResponseDto {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  key: string;
}

class MultipleUploadResponseDto {
  files: UploadResponseDto[];
  count: number;
}

class PresignedUrlResponseDto {
  url: string;
  key: string;
  expiresIn: number;
}

// ===========================================
// Upload Controller
// ===========================================

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly minioService: MinioService) {}

  // ===========================================
  // Property Images Upload
  // ===========================================

  @Post('property/:propertyId/images')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @UseInterceptors(FilesInterceptor('images', 20)) // Max 20 images
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
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    type: MultipleUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadPropertyImages(
    @Param('propertyId') propertyId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
  ): Promise<MultipleUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`,
        );
      }
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('File size exceeds 10MB limit');
      }
    }

    const uploadedFiles = await this.minioService.uploadFiles(files, {
      folder: `properties/${propertyId}`,
      metadata: {
        'Property-Id': propertyId,
        'Uploaded-By': userId,
      },
    });

    return {
      files: uploadedFiles,
      count: uploadedFiles.length,
    };
  }

  // ===========================================
  // Single Image Upload
  // ===========================================

  @Post('property/:propertyId/image')
  @Roles(...PROPERTY_MANAGEMENT_ROLES)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Upload a single image for a property' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: UploadResponseDto,
  })
  async uploadPropertyImage(
    @Param('propertyId') propertyId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ): Promise<UploadedFileResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`,
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    return this.minioService.uploadFile(file, {
      folder: `properties/${propertyId}`,
      metadata: {
        'Property-Id': propertyId,
        'Uploaded-By': userId,
      },
    });
  }

  // ===========================================
  // User Avatar Upload
  // ===========================================

  @Post('user/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    type: UploadResponseDto,
  })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ): Promise<UploadedFileResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`,
      );
    }

    // Max 5MB for avatars
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    return this.minioService.uploadFile(file, {
      folder: `users/${userId}`,
      fileName: `avatar-${Date.now()}.${file.mimetype.split('/')[1]}`,
      metadata: {
        'User-Id': userId,
        Type: 'avatar',
      },
    });
  }

  // ===========================================
  // Delete Image
  // ===========================================

  @Delete('file')
  @HttpCode(HttpStatus.OK)
  @Roles(...STORAGE_FILE_DELETE_ROLES)
  @ApiOperation({ summary: 'Delete a file from storage' })
  @ApiQuery({ name: 'key', description: 'File key/path to delete' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Query('key') key: string): Promise<{ message: string }> {
    if (!key) {
      throw new BadRequestException('File key is required');
    }

    const exists = await this.minioService.fileExists(key);
    if (!exists) {
      throw new BadRequestException('File not found');
    }

    await this.minioService.deleteFile(key);

    return { message: 'File deleted successfully' };
  }

  // ===========================================
  // List Property Images
  // ===========================================

  @Get('property/:propertyId/images')
  @ApiOperation({ summary: 'List all images for a property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'List of image URLs',
  })
  async listPropertyImages(
    @Param('propertyId') propertyId: string,
  ): Promise<{ images: string[]; count: number }> {
    const prefix = `properties/${propertyId}/`;
    const files = await this.minioService.listFiles(prefix);
    const urls = files.map((key) => this.minioService.getPublicUrl(key));

    return {
      images: urls,
      count: urls.length,
    };
  }

  // ===========================================
  // Get Presigned Upload URL
  // ===========================================

  @Get('presigned-url')
  @ApiOperation({ summary: 'Get a presigned URL for direct upload' })
  @ApiQuery({ name: 'folder', description: 'Target folder', required: false })
  @ApiQuery({ name: 'filename', description: 'File name', required: true })
  @ApiQuery({
    name: 'expiry',
    description: 'URL expiry in seconds',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated',
    type: PresignedUrlResponseDto,
  })
  async getPresignedUploadUrl(
    @Query('folder') folder: string = 'temp',
    @Query('filename') filename: string,
    @Query('expiry') expiry: number = 3600,
    @CurrentUser('id') userId: string,
  ): Promise<PresignedUrlResponseDto> {
    if (!filename) {
      throw new BadRequestException('Filename is required');
    }

    const key = `${folder}/${userId}/${Date.now()}-${filename}`;
    const url = await this.minioService.getPresignedUploadUrl(key, expiry);

    return {
      url,
      key,
      expiresIn: expiry,
    };
  }
}
