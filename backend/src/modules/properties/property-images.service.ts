// ===========================================
// SmartProperty - Property Images Service
// ===========================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { Repository } from 'typeorm';
import { MinioService, UploadedFile } from '../upload/minio.service';
import { UserRole } from '../users/entities/user.entity';
import { hasPlatformAdminRole } from '../users/role-groups';
import { Property } from './entities/property.entity';
// ===========================================
// Interfaces
// ===========================================

export interface PropertyImage {
  url: string;
  key: string;
  caption?: string;
  isPrimary?: boolean;
  order?: number;
  uploadedAt?: Date;
}

export interface AddImagesResult {
  property: Property;
  addedImages: UploadedFile[];
  totalImages: number;
}

// ===========================================
// Property Images Service
// ===========================================
@Injectable()
export class PropertyImagesService {
  private readonly logger = new Logger(PropertyImagesService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly minioService: MinioService,
  ) {}

  // ===========================================
  // Upload Images
  // ===========================================

  /**
   * Upload images for a property
   */
  async uploadImages(
    propertyId: string,
    files: Express.Multer.File[],
    userId: string,
    userRole: UserRole,
  ): Promise<AddImagesResult> {
    // Find the property
    const property = await this.findPropertyOrFail(propertyId);

    // Check authorization
    this.checkAuthorization(property, userId, userRole);

    // Upload files to MinIO
    const uploadedFiles = await this.minioService.uploadFiles(files, {
      folder: `properties/${propertyId}`,
      metadata: {
        'Property-Id': propertyId,
        'Uploaded-By': userId,
      },
    });

    // Convert to PropertyImage format
    const existingImages = property.images || [];
    const newImages: PropertyImage[] = uploadedFiles.map((file, index) => ({
      url: file.url,
      key: file.key,
      caption: undefined,
      isPrimary: existingImages.length === 0 && index === 0, // First image is primary if no images exist
      order: existingImages.length + index,
      uploadedAt: new Date(),
    }));

    // Update property with new images
    property.images = [...existingImages, ...newImages];
    await this.propertyRepository.save(property);

    this.logger.log(
      `Added ${uploadedFiles.length} images to property ${propertyId}`,
    );

    return {
      property,
      addedImages: uploadedFiles,
      totalImages: property.images?.length || 0,
    };
  }

  // ===========================================
  // Delete Images
  // ===========================================

  /**
   * Delete an image from a property
   */
  async deleteImage(
    propertyId: string,
    imageKey: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.findPropertyOrFail(propertyId);
    this.checkAuthorization(property, userId, userRole);

    // Find the image
    const imageIndex = property.images?.findIndex(
      (img) => img.key === imageKey,
    );
    if (imageIndex === undefined || imageIndex === -1) {
      throw new NotFoundException('Image not found in property');
    }

    // Delete from MinIO
    await this.minioService.deleteFile(imageKey);

    // Remove from property
    const wasPrimary = property.images![imageIndex].isPrimary;
    property.images!.splice(imageIndex, 1);

    // If deleted image was primary, set first remaining image as primary
    if (wasPrimary && property.images!.length > 0) {
      property.images![0].isPrimary = true;
    }

    await this.propertyRepository.save(property);
    this.logger.log(`Deleted image ${imageKey} from property ${propertyId}`);

    return property;
  }

  /**
   * Delete all images for a property
   */
  async deleteAllImages(
    propertyId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.findPropertyOrFail(propertyId);
    this.checkAuthorization(property, userId, userRole);

    if (property.images && property.images.length > 0) {
      // Delete all from MinIO
      const keys = property.images
        .map((img) => img.key)
        .filter((key): key is string => Boolean(key));

      if (keys.length > 0) {
        await this.minioService.deleteFiles(keys);
      }

      // Clear images array
      property.images = [];
      await this.propertyRepository.save(property);
      this.logger.log(`Deleted all images from property ${propertyId}`);
    }

    return property;
  }

  // ===========================================
  // Manage Images
  // ===========================================

  /**
   * Set primary image
   */
  async setPrimaryImage(
    propertyId: string,
    imageKey: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.findPropertyOrFail(propertyId);
    this.checkAuthorization(property, userId, userRole);

    if (!property.images || property.images.length === 0) {
      throw new BadRequestException('Property has no images');
    }

    const imageIndex = property.images.findIndex((img) => img.key === imageKey);
    if (imageIndex === -1) {
      throw new NotFoundException('Image not found in property');
    }

    // Update primary status
    property.images = property.images.map((img, index) => ({
      ...img,
      isPrimary: index === imageIndex,
    }));

    await this.propertyRepository.save(property);
    this.logger.log(
      `Set primary image for property ${propertyId}: ${imageKey}`,
    );

    return property;
  }

  /**
   * Update image caption
   */
  async updateImageCaption(
    propertyId: string,
    imageKey: string,
    caption: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.findPropertyOrFail(propertyId);
    this.checkAuthorization(property, userId, userRole);

    const imageIndex = property.images?.findIndex(
      (img) => img.key === imageKey,
    );
    if (imageIndex === undefined || imageIndex === -1) {
      throw new NotFoundException('Image not found in property');
    }

    property.images![imageIndex].caption = caption;
    await this.propertyRepository.save(property);

    return property;
  }

  /**
   * Reorder images
   */
  async reorderImages(
    propertyId: string,
    imageKeys: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.findPropertyOrFail(propertyId);
    this.checkAuthorization(property, userId, userRole);

    if (!property.images || property.images.length === 0) {
      throw new BadRequestException('Property has no images');
    }

    // Validate all keys exist
    const existingKeys = new Set(
      property.images.map((img) => img.key).filter(Boolean),
    );
    for (const key of imageKeys) {
      if (!existingKeys.has(key)) {
        throw new BadRequestException(`Image key not found: ${key}`);
      }
    }

    // Create a map for quick lookup
    const imageMap = new Map(property.images.map((img) => [img.key, img]));

    // Reorder based on provided keys
    property.images = imageKeys.map((key, index) => ({
      ...imageMap.get(key)!,
      order: index,
    }));

    await this.propertyRepository.save(property);

    return property;
  }

  // ===========================================
  // Query Images
  // ===========================================

  /**
   * Get all images for a property
   */
  async getImages(propertyId: string): Promise<PropertyImage[]> {
    const property = await this.findPropertyOrFail(propertyId);
    const images = property.images || [];
    return images
      .map((img) => ({
        url: img.url,
        key: img.key || '',
        caption: img.caption,
        isPrimary: img.isPrimary,
        order: img.order,
        uploadedAt: img.uploadedAt,
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get primary image for a property
   */
  async getPrimaryImage(propertyId: string): Promise<PropertyImage | null> {
    const property = await this.findPropertyOrFail(propertyId);
    const images = property.images || [];
    const primaryImg = images.find((img) => img.isPrimary) || images[0];

    if (!primaryImg) {
      return null;
    }

    return {
      url: primaryImg.url,
      key: primaryImg.key || '',
      caption: primaryImg.caption,
      isPrimary: primaryImg.isPrimary,
      order: primaryImg.order,
      uploadedAt: primaryImg.uploadedAt,
    };
  }

  // ===========================================
  // Helpers
  // ===========================================

  private async findPropertyOrFail(propertyId: string): Promise<Property> {
    let property: Property | null;

    try {
      property = await this.propertyRepository.findOne({
        where: { _id: new ObjectId(propertyId) },
      });
    } catch {
      throw new NotFoundException(`Property not found: ${propertyId}`);
    }

    if (!property) {
      throw new NotFoundException(`Property not found: ${propertyId}`);
    }

    return property;
  }

  private checkAuthorization(
    property: Property,
    userId: string,
    userRole: UserRole,
  ): void {
    if (hasPlatformAdminRole(userRole)) {
      return;
    }

    if (property.ownerId === userId) {
      return;
    }

    if (property.managerId === userId) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to manage this property',
    );
  }
}
