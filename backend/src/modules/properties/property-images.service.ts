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
import { AiVirtualTourService } from './ai-virtual-tour.service';
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
  virtualTourGeneration?: {
    requested: boolean;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    message: string;
    eligibleImageCount: number;
    jobId?: string;
  };
}

// ===========================================
// Property Images Service
// ===========================================
@Injectable()
export class PropertyImagesService {
  private readonly logger = new Logger(PropertyImagesService.name);
  private static readonly VIRTUAL_TOUR_MIN_IMAGES = 8;
  private static readonly VIRTUAL_TOUR_ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly minioService: MinioService,
    private readonly aiVirtualTourService: AiVirtualTourService,
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
    generateVirtualTour = false,
  ): Promise<AddImagesResult> {
    // Find the property
    const property = await this.findPropertyOrFail(propertyId);

    // Check authorization
    this.checkAuthorization(property, userId, userRole);

    if (generateVirtualTour) {
      this.validateVirtualTourGenerationInput(property, files);
    }

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

    const result: AddImagesResult = {
      property,
      addedImages: uploadedFiles,
      totalImages: property.images?.length || 0,
    };

    if (generateVirtualTour) {
      const eligibleImageCount = property.images?.length || 0;
      try {
        const aiResult = await this.aiVirtualTourService.requestGeneration({
          propertyId,
          requestedBy: userId,
          processNow: true,
          images: (property.images || [])
            .filter(
              (
                image,
              ): image is PropertyImage & {
                url: string;
                key: string;
              } => Boolean(image.url && image.key),
            )
            .map((image) => ({
              url: image.url,
              key: image.key,
            })),
        });

        this.logger.log(
          `Virtual tour generation queued for property ${propertyId} (job ${aiResult.jobId})`,
        );

        result.virtualTourGeneration = {
          requested: true,
          status: aiResult.status,
          message: aiResult.message,
          eligibleImageCount,
          jobId: aiResult.jobId,
        };

        // Persist job id / result to property so UI and admins can inspect status/errors
        if (aiResult.jobId) {
          // store job id for later status checks
          (property as any).virtualTourJobId = aiResult.jobId;
        }

        if (aiResult.status === 'completed' && aiResult.panoramaPath) {
          property.virtualTour = aiResult.panoramaPath;
          // clear any previous error
          (property as any).virtualTourError = null;
          await this.propertyRepository.save(property);
          this.logger.log(
            `Saved panorama to property ${propertyId}: ${aiResult.panoramaPath}`,
          );
        } else if (aiResult.status === 'failed') {
          // persist error message for visibility in UI/admin
          (property as any).virtualTourError =
            aiResult.error || aiResult.message || 'Unknown error';
          await this.propertyRepository.save(property);
          this.logger.warn(
            `Virtual tour generation failed for property ${propertyId} job=${aiResult.jobId} error=${(property as any).virtualTourError}`,
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Virtual tour AI generation could not be queued.';
        this.logger.error(
          `Virtual tour generation queue failed for property ${propertyId}: ${message}`,
        );

        result.virtualTourGeneration = {
          requested: false,
          status: 'failed',
          message,
          eligibleImageCount,
        };
      }
    }

    return result;
  }

  private validateVirtualTourGenerationInput(
    property: Property,
    newFiles: Express.Multer.File[],
  ): void {
    const totalEligibleImages =
      (property.images?.length || 0) + newFiles.length;

    if (totalEligibleImages < PropertyImagesService.VIRTUAL_TOUR_MIN_IMAGES) {
      throw new BadRequestException(
        `Virtual tour generation requires at least ${PropertyImagesService.VIRTUAL_TOUR_MIN_IMAGES} images.`,
      );
    }

    const invalidFile = newFiles.find(
      (file) =>
        !PropertyImagesService.VIRTUAL_TOUR_ALLOWED_MIME_TYPES.has(
          file.mimetype,
        ),
    );

    if (invalidFile) {
      throw new BadRequestException(
        'Virtual tour generation supports only JPEG, PNG, and WebP images.',
      );
    }
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
    const currentUserId = this.normalizeId(userId);
    const ownerId = this.normalizeId(property.ownerId);
    const managerId = this.normalizeId(property.managerId);

    if (hasPlatformAdminRole(userRole)) {
      return;
    }

    if (ownerId && ownerId === currentUserId) {
      return;
    }

    if (managerId && managerId === currentUserId) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to manage this property',
    );
  }

  private normalizeId(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value instanceof ObjectId) {
      return value.toHexString();
    }

    if (typeof value === 'object' && value !== null) {
      const withHex = value as {
        toHexString?: () => string;
        toString: () => string;
      };

      if (typeof withHex.toHexString === 'function') {
        return withHex.toHexString();
      }

      return withHex.toString();
    }

    return String(value);
  }

  /**
   * Get virtual tour panorama for a property
   */
  async getPanorama(propertyId: string) {
    const property = await this.findPropertyOrFail(propertyId);

    if (!property.virtualTour) {
      this.logger.warn(
        `Virtual tour panorama not available for property ${propertyId} (virtualTour field is empty)`,
      );
      throw new NotFoundException(
        'Virtual tour panorama not available for this property',
      );
    }

    this.logger.log(
      `Attempting to retrieve panorama for property ${propertyId} from path: ${property.virtualTour}`,
    );

    const jobId = this.extractPanoramaJobId(property.virtualTour);
    if (!jobId) {
      this.logger.error(
        `Failed to extract jobId from panoramaPath: ${property.virtualTour}`,
      );
      throw new NotFoundException('Failed to retrieve panorama image');
    }

    this.logger.log(
      `Extracted jobId=${jobId} for property ${propertyId}. Requesting from AI service...`,
    );

    try {
      const panorama = await this.aiVirtualTourService.getPanoramaImage(
        propertyId,
        jobId,
      );
      this.logger.log(
        `Successfully retrieved panorama for property ${propertyId}`,
      );
      return panorama;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve panorama for property ${propertyId} jobId=${jobId}: ${
          (error as Error).message
        }`,
      );
      throw new NotFoundException('Failed to retrieve panorama image');
    }
  }

  /**
   * Return AI virtual tour job status or persisted error for a property
   */
  async getVirtualTourStatus(propertyId: string) {
    const property = await this.findPropertyOrFail(propertyId);

    // If there is an explicit persisted error, return it immediately
    const persistedError = (property as any).virtualTourError;
    const persistedJobId = (property as any).virtualTourJobId;

    if (!persistedJobId && !property.virtualTour && !persistedError) {
      throw new NotFoundException(
        'No virtual tour job or panorama found for this property',
      );
    }

    // If we have a job id persisted, query AI service
    if (persistedJobId) {
      try {
        const jobStatus =
          await this.aiVirtualTourService.getJobStatus(persistedJobId);
        return jobStatus;
      } catch (err) {
        this.logger.error(
          `Failed to fetch virtual tour job status for property ${propertyId} job=${persistedJobId}: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    // If no job id but we have an error persisted, return that
    if (persistedError) {
      return {
        jobId: null,
        status: 'failed',
        message: 'Virtual tour generation failed previously',
        error: persistedError,
      };
    }

    // Otherwise, attempt to derive job id from saved panorama path
    const maybeJobId = this.extractPanoramaJobId(property.virtualTour || '');
    if (maybeJobId) {
      try {
        const jobStatus =
          await this.aiVirtualTourService.getJobStatus(maybeJobId);
        return jobStatus;
      } catch (err) {
        this.logger.error(
          `Failed to fetch virtual tour job status for property ${propertyId} job=${maybeJobId}: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    throw new NotFoundException(
      'No virtual tour job information available for this property',
    );
  }

  /**
   * Trigger virtual tour generation for an existing property (uses already uploaded images)
   */
  async triggerVirtualTourGeneration(
    propertyId: string,
    userId: string,
    userRole: UserRole,
    processNow = true,
  ) {
    const property = await this.findPropertyOrFail(propertyId);

    // Authorization
    this.checkAuthorization(property, userId, userRole);

    const images = (property.images || []).filter(
      (img): img is { url: string; key: string } =>
        Boolean(img && img.url && img.key),
    );

    if (images.length < PropertyImagesService.VIRTUAL_TOUR_MIN_IMAGES) {
      throw new BadRequestException(
        `Virtual tour generation requires at least ${PropertyImagesService.VIRTUAL_TOUR_MIN_IMAGES} images.`,
      );
    }

    try {
      const aiResult = await this.aiVirtualTourService.requestGeneration({
        propertyId,
        requestedBy: userId,
        processNow,
        images: images.map((i) => ({ url: i.url, key: i.key })),
      });

      // persist job id / errors similar to upload flow
      if ((aiResult as any).jobId) {
        (property as any).virtualTourJobId = (aiResult as any).jobId;
      }

      if (aiResult.status === 'completed' && aiResult.panoramaPath) {
        property.virtualTour = aiResult.panoramaPath;
        (property as any).virtualTourError = null;
      } else if (aiResult.status === 'failed') {
        (property as any).virtualTourError =
          aiResult.error || aiResult.message || 'Unknown error';
      }

      await this.propertyRepository.save(property);

      return aiResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      (property as any).virtualTourError = message;
      await this.propertyRepository.save(property);
      this.logger.error(
        `Failed to queue virtual tour for property ${propertyId}: ${message}`,
      );
      throw err;
    }
  }

  private extractPanoramaJobId(value: string): string | null {
    const lastSegment = value.split(/[\\/]/).pop();
    if (!lastSegment) {
      return null;
    }

    return lastSegment.replace(/\.jpg$/i, '');
  }

  // ===========================================
  // Virtual Tour Config (Hotspots)
  // ===========================================

  async updateVirtualTourConfig(
    propertyId: string,
    config: { hotspots: Array<{ id: string; sourceRoomKey: string; targetRoomKey: string; yaw: number; pitch: number; label: string }>; defaultRoomKey?: string },
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.findPropertyOrFail(propertyId);
    this.checkAuthorization(property, userId, userRole);

    const imageKeys = new Set(
      (property.images || []).map((img) => img.key).filter(Boolean),
    );

    for (const hotspot of config.hotspots) {
      if (!imageKeys.has(hotspot.sourceRoomKey)) {
        throw new BadRequestException(
          `Source room key "${hotspot.sourceRoomKey}" does not match any image on this property.`,
        );
      }
      if (!imageKeys.has(hotspot.targetRoomKey)) {
        throw new BadRequestException(
          `Target room key "${hotspot.targetRoomKey}" does not match any image on this property.`,
        );
      }
    }

    if (config.defaultRoomKey && !imageKeys.has(config.defaultRoomKey)) {
      throw new BadRequestException(
        `Default room key "${config.defaultRoomKey}" does not match any image on this property.`,
      );
    }

    property.virtualTourConfig = config;
    return this.propertyRepository.save(property);
  }
}
