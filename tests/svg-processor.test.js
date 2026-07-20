import { describe, it, expect } from 'vitest';
import { sanitizeId, extractAttributes, svgToSymbol, processSVGFile, buildSprite } from '../src/core/svg-processor.js';

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

  it('extracts stroke attributes', () => {
    const result = extractAttributes('viewBox="0 0 16 16" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"');
    expect(result).toEqual({ viewBox: '0 0 16 16', stroke: 'red', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
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

  it('handles single-quoted attributes', () => {
    const result = extractAttributes("viewBox='0 0 24 24' fill='none' stroke='red'");
    expect(result).toEqual({ viewBox: '0 0 24 24', fill: 'none', stroke: 'red' });
  });

  it('handles mixed quotes', () => {
    const result = extractAttributes('viewBox="0 0 24 24" fill=\'none\' stroke="red"');
    expect(result).toEqual({ viewBox: '0 0 24 24', fill: 'none', stroke: 'red' });
  });
});

describe('svgToSymbol', () => {
  it('converts SVG to symbol', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M12 2"/></svg>';
    const result = await svgToSymbol('home', svg);

    expect(result).toContain("<symbol id='home'");
    expect(result).toContain('viewBox="0 0 24 24"');
    expect(result).toContain('fill="none"');
    expect(result).not.toContain('<?xml');
    expect(result).not.toContain('</svg>');
    expect(result).toContain('</symbol>');
    expect(result).not.toContain('xmlns=');
  });

  it('strips XML declaration', async () => {
    const svg = '<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/></svg>';
    const result = await svgToSymbol('test', svg);

    expect(result).not.toContain('<?xml');
    expect(result).toContain("<symbol id='test'");
  });

  it('strips .svg extension from id when passed via processSVGFile', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2"/></svg>';
    const result = await svgToSymbol('arrow-left', svg);
    expect(result).toContain("id='arrow-left'");
  });

  it('handles SVG without viewBox', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';
    const result = await svgToSymbol('nobox', svg);
    expect(result).toContain("<symbol id='nobox'");
    expect(result).not.toContain('viewBox');
  });

  it('handles SVG with single-quoted attributes', async () => {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><path d='M3 12h18'/></svg>";
    const result = await svgToSymbol('single', svg);
    expect(result).toContain("<symbol id='single'");
    expect(result).toContain('viewBox="0 0 24 24"');
    expect(result).toContain('fill="none"');
  });
});

describe('processSVGFile', () => {
  it('returns symbol and sizes with optimization', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2"/></svg>';
    const result = await processSVGFile('test.svg', svg, true);

    expect(result.symbol).toBeTruthy();
    expect(result.symbol).toContain("<symbol id='test'");
    expect(result.rawSize).toBeGreaterThan(0);
    expect(result.optimizedSize).toBeGreaterThan(0);
  });

  it('returns optimizedSize as null when optimization disabled', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2"/></svg>';
    const result = await processSVGFile('test.svg', svg, false);

    expect(result.symbol).toBeTruthy();
    expect(result.optimizedSize).toBe(null);
  });

  it('optimization reduces or maintains size', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2"/></svg>';
    const without = await processSVGFile('test.svg', svg, false);
    const with_ = await processSVGFile('test.svg', svg, true);

    expect(with_.symbol.length).toBeLessThanOrEqual(without.symbol.length);
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
