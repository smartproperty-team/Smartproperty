import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/entities/application.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Property } from '../properties/entities/property.entity';
import { UploadModule } from '../upload/upload.module';
import { User } from '../users/entities/user.entity';
import { Lease } from './entities/lease.entity';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lease, Application, Property, User]),
    UploadModule,
    NotificationsModule,
  ],
  controllers: [LeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}
