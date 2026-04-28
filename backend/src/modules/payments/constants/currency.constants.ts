// ===========================================
// SmartProperty - Currency Constants
// ===========================================

/**
 * Currency Configuration for Payments
 *
 * IMPORTANT: All amounts in the database are stored in MILLIMES
 * (TND × 1000) to avoid float precision issues
 *
 * Conversion Guide:
 * - 1 TND = 1000 millimes
 * - When receiving from user: multiply by 1000
 * - When displaying to user: divide by 1000
 */

export const CURRENCY_CONFIG = {
  DEFAULT_CURRENCY: 'TND',
  MILLIMES_PER_UNIT: 1000, // 1 TND = 1000 millimes
};

/**
 * Convert TND (display value) to millimes (storage value)
 * @param tnd Amount in TND
 * @returns Amount in millimes
 */
export function tndToMillimes(tnd: number): number {
  return Math.round(tnd * CURRENCY_CONFIG.MILLIMES_PER_UNIT);
}

/**
 * Convert millimes (storage value) to TND (display value)
 * @param millimes Amount in millimes
 * @returns Amount in TND
 */
export function millimesToTnd(millimes: number): number {
  return millimes / CURRENCY_CONFIG.MILLIMES_PER_UNIT;
}

/**
 * Format amount for display
 * @param millimes Amount in millimes
 * @returns Formatted string (e.g., "123.456 TND")
 */
export function formatCurrency(millimes: number): string {
  const tnd = millimesToTnd(millimes);
  return `${tnd.toFixed(3)} TND`;
}

/**
 * Example Usage:
 *
 * // User enters 150 TND in frontend
 * const userInput = 150;
 * const storedValue = tndToMillimes(userInput); // 150000
 *
 * // Display to user
 * const display = millimesToTnd(150000); // 150
 * const formatted = formatCurrency(150000); // "150.000 TND"
 */
