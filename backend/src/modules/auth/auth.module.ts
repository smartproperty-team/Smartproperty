// ===========================================
// SmartProperty - Auth Module
// ===========================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Session } from './entities/session.entity';
import { SessionService } from './session.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // User and Session repositories
    TypeOrmModule.forFeature([User, Session]),

    // Passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'default_jwt_secret',
        signOptions: {
          expiresIn: configService.get<number>('jwt.expiresInSeconds') || 3600,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService, SessionService, JwtModule, PassportModule],
})
export class AuthModule {}
