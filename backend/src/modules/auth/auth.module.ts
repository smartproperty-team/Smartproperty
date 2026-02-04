// ===========================================
// Auth Module
// ===========================================

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserProfile } from '../../common/entities/user-profile.entity';
import { User } from '../../common/entities/user.entity';
import { JwtStrategy } from '../../common/strategies';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: true }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => {
        const secret = configService.get<string>('jwt.secret');
        const expiresIn = configService.get<string>('jwt.expiresIn') || '1d';
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([User, UserProfile]),
    UsersModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, FacebookStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
