// ===========================================
// Users Module
// ===========================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserProfile } from '../../common/entities';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile])],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
