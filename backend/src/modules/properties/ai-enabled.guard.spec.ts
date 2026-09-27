import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiEnabledGuard } from './ai-enabled.guard';

const guardWith = (enabled: unknown) =>
  new AiEnabledGuard({
    get: () => enabled,
  } as unknown as ConfigService);

describe('AiEnabledGuard', () => {
  it('refuses with 503 while AI is switched off', () => {
    expect(() => guardWith(false).canActivate()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('refuses when the flag is missing', () => {
    expect(() => guardWith(undefined).canActivate()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('allows the request when AI is switched on', () => {
    expect(guardWith(true).canActivate()).toBe(true);
  });
});
