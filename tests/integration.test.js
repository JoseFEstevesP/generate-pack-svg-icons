import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processSVGFile, buildSprite } from '../src/core/svg-processor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('integration: SVG processing pipeline', () => {
  let simpleSVG;
  let declaredSVG;

  beforeAll(() => {
    simpleSVG = fs.readFileSync(path.join(FIXTURES_DIR, 'simple.svg'), 'utf8');
    declaredSVG = fs.readFileSync(path.join(FIXTURES_DIR, 'with-xml-declaration.svg'), 'utf8');
  });

  it('processes a simple SVG with optimization', async () => {
    const result = await processSVGFile('simple.svg', simpleSVG, true);

    expect(result.symbol).toBeTruthy();
    expect(result.symbol).toContain("<symbol id='simple'");
    expect(result.symbol).toContain('viewBox');
    expect(result.symbol).not.toContain('<?xml');
    expect(result.symbol).not.toContain('</svg>');
    expect(result.symbol).toContain('</symbol>');
    expect(result.rawSize).toBeGreaterThan(0);
  });

  it('processes SVG with XML declaration', async () => {
    const result = await processSVGFile('with-xml-declaration.svg', declaredSVG, true);

    expect(result.symbol).toContain("<symbol id='with-xml-declaration'");
    expect(result.symbol).not.toContain('<?xml');
  });

  it('can disable optimization', async () => {
    const result = await processSVGFile('simple.svg', simpleSVG, false);

    expect(result.symbol).toBeTruthy();
    expect(result.optimizedSize).toBe(null);
  });

  it('optimization reduces size', async () => {
    const without = await processSVGFile('simple.svg', simpleSVG, false);
    const with_ = await processSVGFile('simple.svg', simpleSVG, true);

    expect(with_.symbol.length).toBeLessThanOrEqual(without.symbol.length);
  });

  it('buildSprite combines multiple processed files', async () => {
    const r1 = await processSVGFile('simple.svg', simpleSVG, true);
    const r2 = await processSVGFile('with-xml-declaration.svg', declaredSVG, true);

    const sprite = buildSprite([r1.symbol, r2.symbol]);

    expect(sprite).toContain("id='simple'");
    expect(sprite).toContain("id='with-xml-declaration'");
    expect(sprite).toContain('<?xml version="1.0"');
    expect(sprite).toContain('<svg xmlns=');
    expect(sprite).toContain('</svg>');
  });
});
