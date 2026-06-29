// ─────────────────────────────────────────────────────────────
//  Scraper registry — the single place new stores are wired in.
//  Adding a new website is a one-line change here; the rest of
//  the system (services, API, CLI) discovers it automatically.
// ─────────────────────────────────────────────────────────────
const AppError = require('../utils/AppError');
const StarTechScraper = require('./stores/StarTechScraper');
const GadgetAndGearScraper = require('./stores/GadgetAndGearScraper');
const AppleGadgetsBdScraper = require('./stores/AppleGadgetsBdScraper');
const MobileBuzzBdScraper = require('./stores/MobileBuzzBdScraper');
const GadgetBangladeshScraper = require('./stores/GadgetBangladeshScraper');
const CustomMacBdScraper = require('./stores/CustomMacBdScraper');
const RioInternationalScraper = require('./stores/RioInternationalScraper');
const GadgetStudioBdScraper = require('./stores/GadgetStudioBdScraper');
const { DiamuScraper } = require('./stores/DiamuScraper');
const GadgetMonkeyBdScraper = require('./stores/GadgetMonkeyBdScraper').GadgetMonkeyBdScraper || require('./stores/GadgetMonkeyBdScraper');
const KryInternationalScraper = require('./stores/KryInternationalScraper');
const GadgetNGadgetBdScraper = require('./stores/GadgetNGadgetBdScraper');
const GadgetBdScraper = require('./stores/GadgetBdScraper');

// storeKey -> Scraper class. Adding a new website is a one-line change here.
const SCRAPERS = {
  [StarTechScraper.storeKey]: StarTechScraper,
  [GadgetAndGearScraper.storeKey]: GadgetAndGearScraper,
  [AppleGadgetsBdScraper.storeKey]: AppleGadgetsBdScraper,
  [MobileBuzzBdScraper.storeKey]: MobileBuzzBdScraper,
  [GadgetBangladeshScraper.storeKey]: GadgetBangladeshScraper,
  [CustomMacBdScraper.storeKey]: CustomMacBdScraper,
  [RioInternationalScraper.storeKey]: RioInternationalScraper,
  [GadgetStudioBdScraper.storeKey]: GadgetStudioBdScraper,
  [DiamuScraper.storeKey]: DiamuScraper,
  [GadgetMonkeyBdScraper.storeKey]: GadgetMonkeyBdScraper,
  'kry-international': KryInternationalScraper,
  [GadgetNGadgetBdScraper.storeKey]: GadgetNGadgetBdScraper,
  'gadget-bd': GadgetBdScraper
};

/** List the keys of every registered store. */
function listStoreKeys() {
  return Object.keys(SCRAPERS);
}

/** True if a store key is registered. */
function hasStore(storeKey) {
  return Object.prototype.hasOwnProperty.call(SCRAPERS, storeKey);
}

/**
 * Instantiate a scraper by store key.
 * @throws {AppError} 404 when the store is unknown.
 */
function createScraper(storeKey, overrides = {}) {
  const ScraperClass = SCRAPERS[storeKey];
  if (!ScraperClass) {
    throw AppError.notFound(`Unknown store "${storeKey}"`, {
      availableStores: listStoreKeys(),
    });
  }
  return new ScraperClass(overrides);
}

module.exports = { SCRAPERS, listStoreKeys, hasStore, createScraper };
