// ===========================================
// Throttler (Rate Limiting) Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

/**
 * The global default applied by ThrottlerGuard (see app.module.ts).
 *
 * Stricter per-route limits live on the routes themselves as @Throttle()
 * decorators - login, registration and password reset in auth.controller.ts.
 * A per-endpoint table here would not be read by anything.
 */
export const throttlerConfig = registerAs('throttler', () => ({
  ttl: Number.parseInt(process.env.THROTTLE_TTL ?? '60', 10), // Time window in seconds
  limit: Number.parseInt(process.env.THROTTLE_LIMIT ?? '100', 10), // Max requests per window
}));
