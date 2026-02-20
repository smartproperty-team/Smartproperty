// ===========================================
// SmartProperty - Facebook OAuth Strategy
// ===========================================

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';

export interface FacebookProfile {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  facebookId: string;
}

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);

  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('facebook.clientId') || '',
      clientSecret: configService.get<string>('facebook.clientSecret') || '',
      callbackURL:
        configService.get<string>('facebook.callbackUrl') ||
        'http://localhost:3000/api/auth/facebook/callback',
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
      enableProof: true,
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: FacebookProfile) => void,
  ): void {
    try {
      this.logger.debug(
        `Facebook OAuth validation for user: ${profile.id} (${profile.displayName})`,
      );

      const { id, name, emails, photos, displayName } = profile;

      // Validate email existence
      const email = emails?.[0]?.value;
      if (!email) {
        this.logger.warn(`Facebook user ${id} did not grant email permission`);
        return done(
          new UnauthorizedException(
            'Email permission is required to sign in with Facebook',
          ),
        );
      }

      // Extract first and last name
      let firstName = name?.givenName || '';
      let lastName = name?.familyName || '';

      // Fallback: Parse displayName if name parts are not available
      if (!firstName && displayName) {
        const nameParts = displayName.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      // Ensure at least firstName exists
      if (!firstName) {
        firstName = 'Facebook User';
      }

      const facebookProfile: FacebookProfile = {
        email,
        firstName,
        lastName,
        avatar: photos?.[0]?.value,
        facebookId: id,
      };

      this.logger.debug(
        `Facebook profile extracted: ${email} (${firstName} ${lastName})`,
      );

      done(null, facebookProfile);
    } catch (error) {
      this.logger.error(
        `Facebook OAuth validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      done(error instanceof Error ? error : new Error('Facebook OAuth failed'));
    }
  }
}
