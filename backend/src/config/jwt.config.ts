// ===========================================
// JWT (Authentication) Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

// Helper to parse duration string to seconds
const parseDurationToSeconds = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 3600; // default 1 hour

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return 3600;
  }
};

// Never fall back to a hard-coded signing key in production: a known default
// secret lets anyone mint valid tokens. Fail to boot instead.
const requireSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string => {
  const value = process.env[name];
  if (value && value.length >= 32) {
    return value;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} is missing or shorter than 32 characters. Refusing to start.`,
    );
  }
  return `insecure_dev_only_${name.toLowerCase()}_do_not_use_in_production`;
};

export const jwtConfig = registerAs('jwt', () => {
  const expiresIn = process.env.JWT_EXPIRATION || '1h';

  return {
    // Access token settings
    secret: requireSecret('JWT_SECRET'),
    expiresIn,
    expiresInSeconds: parseDurationToSeconds(expiresIn),

    // Refresh token settings
    refreshSecret: requireSecret('JWT_REFRESH_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',

    // Token settings
    issuer: 'SmartProperty',
    audience: 'smartproperty-users',

    // Cookie settings (for refresh token)
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    },
  };
});
