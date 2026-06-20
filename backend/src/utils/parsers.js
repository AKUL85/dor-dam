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

/** Flatten a nested specs object ({ section: { key: val } }) into one map. */
function flattenSpecs(specs) {
  const flat = {};
  for (const section of Object.values(specs || {})) {
    if (section && typeof section === 'object') Object.assign(flat, section);
  }
  return flat;
}

module.exports = {
  cleanPrice,
  cleanText,
  firstInt,
  findInTable,
  findInProse,
  flattenSpecs,
};
