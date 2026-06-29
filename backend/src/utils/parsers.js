// ─────────────────────────────────────────────────────────────
//  Reusable, store-agnostic text/spec parsing helpers.
//  Shared by every store scraper so parsing logic is never
//  duplicated across modules.
// ─────────────────────────────────────────────────────────────

/** Strip non-digits from a price string and return an integer (or null). */
function cleanPrice(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : null;
}

/** Collapse whitespace and trim. */
function cleanText(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().replace(/\s+/g, ' ');
  return text || null;
}

/** First integer found in a string, or null. */
function firstInt(raw) {
  const match = String(raw ?? '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Look up the first value in a flat key/value object whose key contains
 * any of the provided keywords (case-insensitive).
 */
function findInTable(flat, keywords) {
  for (const kw of keywords) {
    for (const [k, v] of Object.entries(flat)) {
      if (k.toLowerCase().includes(kw.toLowerCase())) return String(v).trim();
    }
  }
  return null;
}

/**
 * Return the first regex match against `text`. If the matched pattern has a
 * capture group it is returned, otherwise the full match is returned.
 */
function findInProse(text, patterns) {
  const haystack = String(text || '');
  for (const pattern of patterns) {
    const m = haystack.match(pattern);
    if (m) return (m[1] ? m[1] : m[0]).trim();
  }
  return null;
}

/**
 * Flatten a specs object into a single flat key/value map.
 * Accepts both a nested shape ({ section: { key: val } }) and an
 * already-flat shape ({ key: val }), so every scraper can share the
 * same key-spec extraction regardless of how it built its table.
 */
function flattenSpecs(specs) {
  const flat = {};
  for (const [key, value] of Object.entries(specs || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flat, value);
    } else if (value !== null && value !== undefined) {
      flat[key] = value;
    }
  }
  return flat;
}

/**
 * Resolve a possibly-localised value. Some APIs store text as a
 * `{ en: "..." }` map rather than a plain string.
 */
function localized(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.en ?? Object.values(value)[0] ?? null;
  return String(value);
}

/** Strip HTML tags from a string and collapse whitespace. */
function stripHtml(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw)
    .replace(/<\s*(br|\/p|\/li|\/h\d|\/tr)\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

/**
 * Derive a normalised set of key phone specs from a flat spec table,
 * falling back to mining the product name and description prose.
 * Shared by every scraper so the canonical product shape is identical
 * across stores.
 */
function extractKeySpecs(specs, productName = '', descriptionText = '') {
  const flat = flattenSpecs(specs);
  const prose = `${descriptionText} ${productName}`.toLowerCase();
  // Mine spec-table values too — RAM/storage are often packed into a
  // single "Memory" cell (e.g. "256GB 12GB RAM"), so prose patterns
  // applied to the values are more accurate than a raw first-integer.
  const tableText = Object.values(flat).map((v) => String(v)).join('  ||  ');
  const blob = `${tableText}  ||  ${prose}`;

  const ram =
    firstInt(
      findInProse(blob, [
        /(\d+)\s*gb\s*(?:of\s*)?ram/i,
        /ram[:\s]+(\d+)\s*gb/i,
        /(\d+)\s*gb\s*lpddr/i,
      ])
    ) ?? firstInt(findInTable(flat, ['RAM']));

  const storage =
    firstInt(findInTable(flat, ['Storage', 'Internal Storage', 'ROM'])) ??
    firstInt(
      findInProse(blob, [
        /(\d+)\s*gb\s*(?:internal\s*)?storage/i,
        /storage[:\s]+(\d+)\s*gb/i,
        /(\d+)\s*gb\s*(?:internal|flash|emmc|ufs|rom)/i,
        /(\d+)\s*gb(?!\s*ram)/i,
      ])
    );

  const chipset =
    findInTable(flat, ['Chipset', 'Processor', 'CPU', 'SoC']) ||
    findInProse(prose, [
      /(snapdragon[\s\w\d]+?(?=\s*(?:chip|process|with|,|\.|5nm|4nm|7nm|\d+\s*gb)))/i,
      /(exynos[\s\d]+)/i,
      /(dimensity[\s\d]+)/i,
      /(mediatek[\s\w]+?(?=\s*chip|\s*process|\s*with|,|\.))/i,
      /(helio[\s\w\d]+)/i,
      /(a\d+\s*bionic)/i,
      /(apple\s+m\d[\w\s]*chip)/i,
    ]);

  const battery =
    findInTable(flat, ['Battery', 'Battery Capacity']) ||
    findInProse(prose, [/(\d{3,5}\s*mah)/i, /battery[:\s]+(\d{3,5}\s*mah)/i]);

  const display =
    findInTable(flat, ['Display', 'Screen Size', 'Screen', 'Size']) ||
    findInProse(prose, [
      /(\d+\.\d+[-\s]inch[\w\s+]*?(?=\s*display|\s*screen|\s*with|,|\.))/i,
      /(\d+\.\d+["'″]\s*[\w\s+]*?(?:amoled|lcd|oled|ips|tft))/i,
    ]);

  const camera =
    findInTable(flat, ['Main Camera', 'Rear Camera', 'Camera']) ||
    findInProse(prose, [
      /(?:rear|main|triple|quad|dual)\s*camera[^.]*?(\d+mp[\w\s+\d]*)/i,
      /(\d+mp\s*\+\s*\d+mp(?:\s*\+\s*\d+mp)*)/i,
      /(\d+\s*mp\s*(?:main|wide|primary))/i,
    ]);

  const os =
    findInTable(flat, ['OS', 'Operating System']) ||
    findInProse(prose, [
      /(android\s*\d+(?:\.\d+)?)/i,
      /(ios\s*\d+(?:\.\d+)?)/i,
      /(one\s*ui\s*\d+(?:\.\d+)?)/i,
    ]);

  const network =
    findInTable(flat, ['Network', 'Connectivity', 'Technology']) ||
    findInProse(prose, [/\b(5g)\b/i, /\b(4g\s*lte)\b/i, /\b(4g)\b/i, /\b(3g)\b/i, /\b(2g)\b/i]);

  return {
    ram: ram ?? null,
    storage: storage ?? null,
    chipset: chipset ? String(chipset).trim() : null,
    battery: battery ? String(battery).trim() : null,
    display: display ? String(display).trim() : null,
    camera: camera ? String(camera).trim() : null,
    os: os ? String(os).trim() : null,
    network: network ? String(network).toUpperCase() : null,
  };
}

module.exports = {
  cleanPrice,
  cleanText,
  firstInt,
  findInTable,
  findInProse,
  flattenSpecs,
  stripHtml,
  localized,
  extractKeySpecs,
};
