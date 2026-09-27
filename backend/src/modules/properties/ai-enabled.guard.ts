// ===========================================
// SmartProperty - AI Feature Switch
// ===========================================

import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Refuses AI routes unless AI_SERVICE_ENABLED is 'true'.
 *
 * ai-services is switched off and not deployed. Without this guard every
 * AI route would still try to reach it and fail with a gateway error; with
 * it, callers get an immediate, explicit 503.
 */
@Injectable()
export class AiEnabledGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (!this.config.get<boolean>('app.aiService.enabled')) {
      throw new ServiceUnavailableException('AI features are disabled');
    }
    return true;
  }
}
