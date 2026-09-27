// ===========================================
// Config factories - parsing and fail-closed behaviour
// ===========================================

import { appConfig } from './app.config';
import { jwtConfig } from './jwt.config';
import { mailConfig } from './mail.config';
import { minioConfig } from './minio.config';
import { throttlerConfig } from './throttler.config';

describe('config factories', () => {
  const saved = { ...process.env };
  const strongSecret = 'x'.repeat(32);

  beforeEach(() => {
    process.env = { ...saved };
  });

  afterAll(() => {
    process.env = saved;
  });

  describe('throttlerConfig', () => {
    it('defaults to 100 requests per 60 seconds', () => {
      delete process.env.THROTTLE_TTL;
      delete process.env.THROTTLE_LIMIT;
      expect(throttlerConfig()).toEqual({ ttl: 60, limit: 100 });
    });

    it('reads both values from the environment', () => {
      process.env.THROTTLE_TTL = '30';
      process.env.THROTTLE_LIMIT = '5';
      expect(throttlerConfig()).toEqual({ ttl: 30, limit: 5 });
    });
  });

  describe('appConfig', () => {
    it('parses numeric settings', () => {
      process.env.PORT = '8080';
      process.env.AI_SERVICE_TIMEOUT_MS = '1500';
      process.env.AI_SERVICE_RETRIES = '3';
      const config = appConfig();
      expect(config.port).toBe(8080);
      expect(config.aiService.timeoutMs).toBe(1500);
      expect(config.aiService.retries).toBe(3);
    });

    it('keeps AI off unless AI_SERVICE_ENABLED is exactly true', () => {
      delete process.env.AI_SERVICE_ENABLED;
      expect(appConfig().aiService.enabled).toBe(false);
      process.env.AI_SERVICE_ENABLED = 'true';
      expect(appConfig().aiService.enabled).toBe(true);
    });
  });

  describe('jwtConfig', () => {
    it('refuses to start in production without strong secrets', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'too-short';
      process.env.JWT_REFRESH_SECRET = strongSecret;
      expect(() => jwtConfig()).toThrow(/JWT_SECRET is missing or shorter/);
    });

    it('uses the configured secrets when they are long enough', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = strongSecret;
      process.env.JWT_REFRESH_SECRET = 'y'.repeat(40);
      const config = jwtConfig();
      expect(config.secret).toBe(strongSecret);
      expect(config.refreshSecret).toBe('y'.repeat(40));
    });

    it('falls back to a clearly-marked dev secret outside production', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;
      expect(jwtConfig().secret).toMatch(/^insecure_dev_only_/);
    });

    it.each([
      ['45s', 45],
      ['15m', 900],
      ['2h', 7200],
      ['7d', 604800],
      ['nonsense', 3600],
    ])('converts JWT_EXPIRATION=%s to %i seconds', (value, seconds) => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_EXPIRATION = value;
      expect(jwtConfig().expiresInSeconds).toBe(seconds);
    });
  });

  describe('mail and object storage ports', () => {
    it('parses SMTP_PORT and MINIO_PORT', () => {
      process.env.SMTP_PORT = '587';
      process.env.MINIO_PORT = '443';
      expect(mailConfig().port).toBe(587);
      expect(minioConfig().port).toBe(443);
    });

    it('defaults to the local development ports', () => {
      delete process.env.SMTP_PORT;
      delete process.env.MINIO_PORT;
      expect(mailConfig().port).toBe(1025);
      expect(minioConfig().port).toBe(9000);
    });
  });

  describe('private bucket', () => {
    it('defaults to the public bucket name with a -private suffix', () => {
      process.env.MINIO_BUCKET_NAME = 'photos';
      delete process.env.MINIO_PRIVATE_BUCKET_NAME;
      expect(minioConfig().privateBucketName).toBe('photos-private');
    });

    it('can be named explicitly', () => {
      process.env.MINIO_PRIVATE_BUCKET_NAME = 'documents';
      expect(minioConfig().privateBucketName).toBe('documents');
    });
  });
});
