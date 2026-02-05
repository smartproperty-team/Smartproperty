// ===========================================
// Google OAuth Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const googleConfig = registerAs('google', () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:3000/api/auth/google/callback',
  frontendCallbackUrl:
    process.env.GOOGLE_FRONTEND_CALLBACK_URL ||
    'http://localhost:5173/auth/google/callback',
}));
