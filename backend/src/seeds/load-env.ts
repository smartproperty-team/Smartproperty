// ===========================================
// SmartProperty - Seed Environment Loader
// ===========================================

import { config as loadEnvFile } from 'dotenv';

/**
 * Seed scripts run standalone through ts-node, outside Nest, so nothing has
 * loaded .env for them. Import this module for its side effect BEFORE reading
 * any environment variable:
 *
 *   import './load-env';
 *
 * Loading must happen at import time, not inside a function, because the seed
 * scripts read process.env into module-level constants. Files are loaded in
 * the same order and precedence AppModule declares, and dotenv does not
 * override variables that are already set, so a real process environment
 * variable still wins.
 */
for (const envFile of ['.env', '.env.development', '.env.local']) {
  loadEnvFile({ path: envFile });
}
