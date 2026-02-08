// ===========================================
// SmartProperty - Auth Module
// ===========================================

import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { AuthAuditService } from './auth-audit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthAuditLog } from './entities/auth-audit-log.entity';
import { Session } from './entities/session.entity';
import { SessionService } from './session.service';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

// Factory to conditionally provide GoogleStrategy only when credentials exist
const googleStrategyFactory: Provider = {
  provide: GoogleStrategy,
  useFactory: (configService: ConfigService) => {
    const clientId = configService.get<string>('google.clientId');
    const clientSecret = configService.get<string>('google.clientSecret');

    if (clientId && clientSecret) {
      return new GoogleStrategy(configService);
    }
    // Return null if Google OAuth is not configured
    return null;
  },
  inject: [ConfigService],
};

// Factory to conditionally provide FacebookStrategy only when credentials exist
const facebookStrategyFactory: Provider = {
  provide: FacebookStrategy,
  useFactory: (configService: ConfigService) => {
    const clientId = configService.get<string>('facebook.clientId');
    const clientSecret = configService.get<string>('facebook.clientSecret');

    if (clientId && clientSecret) {
      return new FacebookStrategy(configService);
    }
    // Return null if Facebook OAuth is not configured
    return null;
  },
  inject: [ConfigService],
};

@Module({
  imports: [
    // User and Session repositories
    TypeOrmModule.forFeature([User, Session, AuthAuditLog]),

    // Config for OAuth
    ConfigModule,

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
  providers: [
    AuthService,
    AuthAuditService,
    SessionService,
    JwtStrategy,
    JwtRefreshStrategy,
    googleStrategyFactory,
    facebookStrategyFactory,
  ],
  exports: [AuthService, SessionService, JwtModule, PassportModule],
})
export class AuthModule {}
