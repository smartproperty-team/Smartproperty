// ===========================================
// Currency Constants - Unit Tests
// ===========================================

import {
  formatCurrency,
  millimesToTnd,
  tndToMillimes,
} from './currency.constants';

describe('Currency Constants', () => {
  describe('tndToMillimes', () => {
    it('should convert 1 TND to 1000 millimes', () => {
      expect(tndToMillimes(1)).toBe(1000);
    });

    it('should convert 150.5 TND to 150500 millimes', () => {
      expect(tndToMillimes(150.5)).toBe(150500);
    });

    it('should handle 0', () => {
      expect(tndToMillimes(0)).toBe(0);
    });

    it('should handle decimal precision', () => {
      expect(tndToMillimes(150.123)).toBe(150123);
    });
  });

  describe('millimesToTnd', () => {
    it('should convert 1000 millimes to 1 TND', () => {
      expect(millimesToTnd(1000)).toBe(1);
    });

    it('should convert 150500 millimes to 150.5 TND', () => {
      expect(millimesToTnd(150500)).toBe(150.5);
    });

    it('should handle 0', () => {
      expect(millimesToTnd(0)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format 1000 millimes as "1.000 TND"', () => {
      expect(formatCurrency(1000)).toBe('1.000 TND');
    });

    it('should format 150500 millimes as "150.500 TND"', () => {
      expect(formatCurrency(150500)).toBe('150.500 TND');
    });

    it('should format 0 as "0.000 TND"', () => {
      expect(formatCurrency(0)).toBe('0.000 TND');
    });
  });

  describe('Round-trip conversion', () => {
    it('should convert TND -> millimes -> TND without loss', () => {
      const original = 150.5;
      const inMillimes = tndToMillimes(original);
      const backToTnd = millimesToTnd(inMillimes);
      expect(backToTnd).toBe(original);
    });
  });
});
