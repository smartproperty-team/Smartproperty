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

export const jwtConfig = registerAs('jwt', () => {
  const expiresIn = process.env.JWT_EXPIRATION || '1h';

  return {
    // Access token settings
    secret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
    expiresIn,
    expiresInSeconds: parseDurationToSeconds(expiresIn),

    // Refresh token settings
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'default_refresh_secret_change_in_production',
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
