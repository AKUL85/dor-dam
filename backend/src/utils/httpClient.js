// ─────────────────────────────────────────────────────────────
//  Minimal resilient HTTP/JSON client built on the native fetch
//  available in Node 18+. Used by API-backed scrapers so they get
//  the same retry/backoff + timeout behaviour as the browser-based
//  scrapers, without pulling in an extra dependency.
// ─────────────────────────────────────────────────────────────
const { withRetry } = require('./retry');
const logger = require('./logger');

const DEFAULT_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/**
 * Fetch a URL with a bounded timeout (via AbortController).
 * Non-2xx responses throw so they can be retried/handled upstream.
 */
async function fetchWithTimeout(url, { headers = {}, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { ...DEFAULT_HEADERS, ...headers },
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} for ${url}`);
      err.status = res.status;
      throw err;
    }
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`, { cause: err });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET a URL and parse the JSON body, with retries on transient failures.
 * @param {string} url
 * @param {object} options { headers, timeoutMs, retries, baseDelayMs, label, logger }
 */
async function getJson(url, options = {}) {
  const {
    headers,
    timeoutMs = 30000,
    retries = 3,
    baseDelayMs = 1000,
    label = `GET ${url}`,
    logger: log = logger,
  } = options;

  return withRetry(
    async () => {
      const res = await fetchWithTimeout(url, { headers, timeoutMs });
      return res.json();
    },
    {
      retries,
      baseDelayMs,
      label,
      logger: log,
      // Do not retry 4xx (except 408/429) — they won't fix themselves.
      shouldRetry: (err) => {
        const s = err.status;
        if (!s) return true;
        if (s === 408 || s === 429) return true;
        return s >= 500;
      },
    }
  );
}

module.exports = { getJson, fetchWithTimeout };
