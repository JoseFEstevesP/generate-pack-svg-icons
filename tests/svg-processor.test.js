import { describe, it, expect } from 'vitest';
import { sanitizeId, extractAttributes, buildSprite } from '../src/core/svg-processor.js';

describe('sanitizeId', () => {
  it('keeps valid names unchanged', () => {
    expect(sanitizeId('home')).toBe('home');
    expect(sanitizeId('arrow-left')).toBe('arrow-left');
    expect(sanitizeId('user_profile')).toBe('user_profile');
  });

  it('replaces special characters with underscores', () => {
    expect(sanitizeId('test@icon')).toBe('test_icon');
    expect(sanitizeId('icon#1')).toBe('icon_1');
    expect(sanitizeId('my icon')).toBe('my_icon');
  });

  it('handles accented characters', () => {
    expect(sanitizeId('icóno')).toBe('icono');
    expect(sanitizeId('café')).toBe('cafe');
  });

  it('ensures valid leading character', () => {
    expect(sanitizeId('123icon')).toBe('_23icon');
    expect(sanitizeId('@test')).toBe('_test');
  });

  it('collapses multiple underscores', () => {
    expect(sanitizeId('a__b')).toBe('a_b');
  });

  it('returns underscore for empty string', () => {
    expect(sanitizeId('')).toBe('_');
  });
});

describe('extractAttributes', () => {
  it('extracts viewBox and fill', () => {
    const result = extractAttributes('viewBox="0 0 24 24" fill="none"');
    expect(result).toEqual({ viewBox: '0 0 24 24', fill: 'none' });
  });

  it('extracts only viewBox when no fill', () => {
    const result = extractAttributes('viewBox="0 0 16 16"');
    expect(result).toEqual({ viewBox: '0 0 16 16' });
    expect(result.fill).toBeUndefined();
  });

  it('returns empty object when no attributes match', () => {
    const result = extractAttributes('width="100" height="100"');
    expect(result).toEqual({});
  });

  it('handles empty string', () => {
    const result = extractAttributes('');
    expect(result).toEqual({});
  });
});

describe('buildSprite', () => {
  it('builds a valid SVG sprite from symbols', () => {
    const symbols = [
      "<symbol id='home' viewBox='0 0 24 24'><path d='M12 2L2 7'/></symbol>",
      "<symbol id='user' viewBox='0 0 24 24'><circle cx='12' cy='8' r='4'/></symbol>",
    ];
    const result = buildSprite(symbols);

    expect(result).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(result).toContain('<svg xmlns="http://www.w3.org/2000/svg">');
    expect(result).toContain("id='home'");
    expect(result).toContain("id='user'");
    expect(result).toContain('</svg>');
  });

  it('returns valid XML with empty symbols array', () => {
    const result = buildSprite([]);
    expect(result).toContain('<svg');
    expect(result).toContain('</svg>');
  });
});
