// ===========================================
// reCAPTCHA Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const recaptchaConfig = registerAs('recaptcha', () => ({
  secretKey: process.env.RECAPTCHA_SECRET_KEY,
  verifyUrl:
    process.env.RECAPTCHA_VERIFY_URL ||
    'https://www.google.com/recaptcha/api/siteverify',
}));
