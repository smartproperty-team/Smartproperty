// ===========================================
// SmartProperty - Facebook OAuth Strategy
// ===========================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';

export interface FacebookProfile {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  facebookId: string;
}

interface FacebookProfileData {
  id: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
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
      scope: ['public_profile', 'email'],
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: FacebookProfileData,
    done: (error: Error | null, user?: FacebookProfile) => void,
  ): void {
    this.logger.debug(`Facebook OAuth validation for user: ${profile.id}`);

    const { id, name, emails, photos } = profile;

    const facebookProfile: FacebookProfile = {
      email: emails?.[0]?.value || '',
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      avatar: photos?.[0]?.value,
      facebookId: id,
    };

    done(null, facebookProfile);
  }
}
