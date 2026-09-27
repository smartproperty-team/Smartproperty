// ===========================================
// SmartProperty - Feature Switches
// ===========================================

/**
 * AI features: description generation, price prediction, virtual staging
 * and best-match recommendations. All of them depend on ai-services, which
 * is switched off and not deployed, so they are hidden unless the build sets
 * VITE_ENABLE_AI_FEATURES=true. The backend refuses the matching routes on
 * its own (AI_SERVICE_ENABLED), so this only keeps the UI honest.
 *
 * Read at build time: VITE_* values are frozen into the bundle.
 */
export const AI_FEATURES_ENABLED =
  import.meta.env.VITE_ENABLE_AI_FEATURES === "true";
