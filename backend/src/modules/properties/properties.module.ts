// ===========================================
// SmartProperty - Properties Module
// ===========================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agency } from '../agencies/entities/agency.entity';
import { UploadModule } from '../upload/upload.module';
import { User } from '../users/entities/user.entity';
import { AiDescriptionService } from './ai-description.service';
import { AiPricingService } from './ai-pricing.service';
import { Property } from './entities/property.entity';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyImagesController } from './property-images.controller';
import { PropertyImagesService } from './property-images.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, User, Agency]),
    UploadModule, // For MinIO service
  ],
  providers: [
    PropertiesService,
    PropertyImagesService,
    AiDescriptionService,
    AiPricingService,
  ],
  controllers: [PropertiesController, PropertyImagesController],
  exports: [PropertiesService, PropertyImagesService, TypeOrmModule],
})
export class PropertiesModule {}
