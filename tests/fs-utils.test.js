import { describe, it, expect } from 'vitest';
import { sanitizeId } from '../src/core/svg-processor.js';

describe('sanitizeId (used by fs-utils)', () => {
  it('handles common icon naming patterns', () => {
    expect(sanitizeId('checkBoxOff')).toBe('checkBoxOff');
    expect(sanitizeId('eye_off')).toBe('eye_off');
    expect(sanitizeId('logo_simpel')).toBe('logo_simpel');
    expect(sanitizeId('cintillo')).toBe('cintillo');
  });

  it('handles camelCase names', () => {
    expect(sanitizeId('paymentMethod')).toBe('paymentMethod');
    expect(sanitizeId('companyRequest')).toBe('companyRequest');
    expect(sanitizeId('medicationDeliveryData')).toBe('medicationDeliveryData');
  });
});
