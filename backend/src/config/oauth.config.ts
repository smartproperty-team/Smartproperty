// ===========================================
// OAuth Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const oauthConfig = registerAs('oauth', () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/api/auth/google/callback',
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL:
      process.env.FACEBOOK_CALLBACK_URL ||
      'http://localhost:3000/api/auth/facebook/callback',
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH,
    callbackURL:
      process.env.APPLE_CALLBACK_URL ||
      'http://localhost:3000/api/auth/apple/callback',
  },
}));
