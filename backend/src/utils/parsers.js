// ─────────────────────────────────────────────────────────────
//  Reusable, store-agnostic text/spec parsing helpers.
//  Shared by every store scraper so parsing logic is never
//  duplicated across modules.
// ─────────────────────────────────────────────────────────────

/**
 * Parse a price string into an integer number of taka.
 * Handles currency symbols, thousands separators and decimal cents
 * (e.g. "BDT. 59,999.00" -> 59999, NOT 5999900).
 */
function cleanPrice(raw) {
  if (raw === null || raw === undefined) return null;
  // Commas are thousands separators in this locale — drop them first so the
  // remaining string contains only the number and a possible decimal point.
  const noCommas = String(raw).replace(/,/g, '');
  // Grab the first number (with an optional decimal part). This naturally
  // ignores currency prefixes like "BDT." / "৳" / "Tk" and trailing cents.
  const match = noCommas.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  return Number.isFinite(value) ? Math.round(value) : null;
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
 * True when `keyword` appears in `key` as a whole word (case-insensitive).
 * Whole-word matching avoids false hits from short keywords being contained
 * in unrelated keys (e.g. "OS" inside "Positioning").
 */
function keyHasKeyword(key, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(String(key));
}

/**
 * Look up the first value in a flat key/value object whose key contains
 * any of the provided keywords as a whole word (case-insensitive).
 */
function findInTable(flat, keywords) {
  for (const kw of keywords) {
    for (const [k, v] of Object.entries(flat)) {
      if (keyHasKeyword(k, kw)) return String(v).trim();
    }
  }
  return null;
}

/**
 * Like findInTable, but only accepts a value that also matches `valueRegex`.
 * Lets callers require, e.g., a camera cell to actually contain a megapixel
 * figure so unrelated cells (or values from the wrong section) are skipped.
 */
function findInTableMatching(flat, keywords, valueRegex) {
  for (const kw of keywords) {
    for (const [k, v] of Object.entries(flat)) {
      if (!keyHasKeyword(k, kw)) continue;
      const value = String(v).trim();
      const m = value.match(valueRegex);
      if (m) return (m[1] ? m[1] : value).trim();
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

  // Prefer the actual mAh capacity (found anywhere in the table values or
  // prose) over a "Battery type" cell that only holds the chemistry.
  const battery =
    findInProse(blob, [/(\d{3,5}\s*mah)/i]) ||
    findInTable(flat, ['Battery Capacity', 'Capacity', 'Battery']);

  const display =
    findInTable(flat, ['Display', 'Screen Size', 'Screen', 'Size']) ||
    findInProse(prose, [
      /(\d+\.\d+[-\s]inch[\w\s+]*?(?=\s*display|\s*screen|\s*with|,|\.))/i,
      /(\d+\.\d+["'″]\s*[\w\s+]*?(?:amoled|lcd|oled|ips|tft))/i,
    ]);

  // A camera value is only useful if it carries a megapixel figure. Restrict
  // the search to camera-labelled cells (so the "MP" core-count of a GPU like
  // "Mali-G715 MP7" is never mistaken for a camera), then fall back to prose.
  const camera =
    findInTableMatching(
      flat,
      ['Main Camera', 'Rear Camera', 'Primary Camera', 'Camera Resolution', 'Camera'],
      /(\d+\s*mp(?:\s*\+\s*\d+\s*mp)*)/i
    ) ||
    findInProse(prose, [
      /(?:rear|main|triple|quad|dual)\s*camera[^.]*?(\d+\s*mp[\w\s+\d]*)/i,
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
  findInTableMatching,
  findInProse,
  flattenSpecs,
  stripHtml,
  localized,
  extractKeySpecs,
};
