// ===========================================
// Facebook OAuth Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const facebookConfig = registerAs('facebook', () => ({
  clientId: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackUrl:
    process.env.FACEBOOK_CALLBACK_URL ||
    'http://localhost:3000/api/auth/facebook/callback',
  frontendCallbackUrl:
    process.env.FACEBOOK_FRONTEND_CALLBACK_URL ||
    'http://localhost:5173/auth/facebook/callback',
}));
