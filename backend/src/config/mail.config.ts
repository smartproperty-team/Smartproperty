// ===========================================
// Mail (SMTP) Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => {
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASSWORD || '';

  return {
    // SMTP settings
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10), // MailHog default for dev
    secure: process.env.SMTP_SECURE === 'true',

    // Authentication - only include if credentials are provided (MailHog doesn't need auth)
    ...(user && pass ? { auth: { user, pass } } : {}),

    // Sender defaults
    defaults: {
      from: {
        name: process.env.SMTP_FROM_NAME || 'SmartProperty',
        address: process.env.SMTP_FROM_EMAIL || 'noreply@smartproperty.com',
      },
    },

    // Template settings
    template: {
      dir: 'src/templates/emails',
      adapter: 'handlebars',
      options: {
        strict: true,
      },
    },
  };
});
