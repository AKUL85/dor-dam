// ─────────────────────────────────────────────────────────────
//  Thin wrapper around Playwright's chromium lifecycle.
//  Centralises browser/context creation so every scraper shares
//  the same hardened launch options (sandbox flags, bot user
//  agent, asset blocking) instead of duplicating setup.
// ─────────────────────────────────────────────────────────────
const { chromium } = require('playwright');
const config = require('../../config/env');
const logger = require('../../utils/logger');

// Heavy assets are blocked to speed up scraping and reduce bandwidth.
const BLOCKED_ASSET_RE = /\.(png|jpe?g|gif|webp|svg|woff2?|ttf|eot)(\?|$)/i;

class Browser {
  constructor(options = {}) {
    this.headless = options.headless ?? config.scraper.headless;
    this.userAgent = options.userAgent || config.scraper.userAgent;
    this.blockAssets = options.blockAssets ?? true;
    this.log = (options.logger || logger).child({ scope: 'Browser' });

    this.browser = null;
    this.context = null;
  }

  async launch() {
    this.log.debug('Launching chromium', { headless: this.headless });
    this.browser = await chromium.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.context = await this.browser.newContext({
      userAgent: this.userAgent,
      viewport: { width: 1280, height: 800 },
      locale: 'en-BD',
    });

    if (this.blockAssets) {
      await this.context.route('**/*', (route) => {
        const url = route.request().url();
        if (BLOCKED_ASSET_RE.test(url)) return route.abort();
        return route.continue();
      });
    }

    return this.context;
  }

  async newPage() {
    if (!this.context) throw new Error('Browser not launched. Call launch() first.');
    return this.context.newPage();
  }

  async close() {
    try {
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch (err) {
      this.log.warn('Error while closing browser', { error: err.message });
    } finally {
      this.context = null;
      this.browser = null;
    }
  }
}

module.exports = Browser;
