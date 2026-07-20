import { optimize } from 'svgo';
import { XMLParser } from 'fast-xml-parser';
import svgoConfig from '../../svgo.config.js';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: false,
  trimValues: true,
  parseTagValue: false,
  stopNodes: ['*'],
});

const SVG_ATTRS = ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];

export function sanitizeId(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^[^a-zA-Z_]/, '_')
    .replace(/__+/g, '_')
    .replace(/_$/, '')
    || '_';
}

export function extractAttributes(svgTagContent) {
  const attrs = {};
  const raw = `<svg ${svgTagContent.trim()} />`;
  try {
    const parsed = xmlParser.parse(raw);
    const svg = parsed?.svg;
    if (!svg) return attrs;
    for (const attr of SVG_ATTRS) {
      const key = '@_' + attr;
      if (svg[key] !== undefined) {
        attrs[attr] = String(svg[key]);
      }
    }
  } catch {
    return attrs;
  }
  return attrs;
}

function buildAttributesString(attrs) {
  let result = '';
  if (attrs.viewBox) result += ` viewBox="${attrs.viewBox}"`;
  if (attrs.fill) result += ` fill="${attrs.fill}"`;
  if (attrs.stroke) result += ` stroke="${attrs.stroke}"`;
  if (attrs['stroke-width']) result += ` stroke-width="${attrs['stroke-width']}"`;
  if (attrs['stroke-linecap']) result += ` stroke-linecap="${attrs['stroke-linecap']}"`;
  if (attrs['stroke-linejoin']) result += ` stroke-linejoin="${attrs['stroke-linejoin']}"`;
  return result;
}

export async function svgToSymbol(fileName, content) {
  const sanitizedName = sanitizeId(fileName);

  let processed = content.replace(/<\?xml[^>]*\?>\s*/, '');

  const svgTagMatch = processed.match(/<svg([^>]*)>/);
  const attrs = svgTagMatch ? extractAttributes(svgTagMatch[1]) : {};

  const attrsString = buildAttributesString(attrs);

  processed = processed.replace(
    /<svg[^>]*>/,
    `<symbol id='${sanitizedName}'${attrsString}>`
  );
  processed = processed.replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
  processed = processed.replace('</svg>', '</symbol>');

  return processed.trim();
}

export async function optimizeSVG(content, filePath) {
  try {
    const result = await optimize(content, {
      path: filePath,
      ...svgoConfig,
    });
    return result.data;
  } catch {
    return content;
  }
}

export async function processSVGFile(fileName, content, withOptimization = true) {
  let raw = content;
  let optimizedSize = null;
  const rawSize = raw.length;

  if (withOptimization) {
    const optimized = await optimizeSVG(raw, fileName);
    optimizedSize = optimized.length;
    raw = optimized;
  }

  const symbol = await svgToSymbol(
    fileName.replace(/\.svg$/i, ''),
    raw
  );

  return { symbol, rawSize, optimizedSize };
}

export function buildSprite(symbols) {
  const header = '<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg">\n';
  const footer = '</svg>';
  return header + symbols.join('\n') + '\n' + footer;
}
