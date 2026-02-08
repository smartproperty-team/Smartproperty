// ===========================================
// SmartProperty - Facebook OAuth Guard
// ===========================================

import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FacebookOAuthGuard extends AuthGuard('facebook') {
  constructor(private configService: ConfigService) {
    super({
      scope: ['email'],
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if Facebook OAuth is configured
    const clientId = this.configService.get<string>('facebook.clientId');
    const clientSecret = this.configService.get<string>(
      'facebook.clientSecret',
    );

    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'Facebook OAuth is not configured. Please set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET environment variables.',
      );
    }

    const activate = (await super.canActivate(context)) as boolean;
    return activate;
  }
}
