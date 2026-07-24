// ─────────────────────────────────────────────────────────────
//  GSMArena HTML parsers (pure functions).
//
//  Kept side-effect free (no network, no fs) so they can be unit
//  tested against saved HTML fixtures. Every function takes a
//  cheerio instance (`$`) already loaded with the page markup.
// ─────────────────────────────────────────────────────────────
const GSM_BASE = 'https://www.gsmarena.com/';

/** Collapse whitespace and trim; returns '' for empty/nullish input. */
function clean(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/\s+/g, ' ').trim();
}

/** Absolute-ise a GSMArena relative link. */
function absUrl(href) {
  if (!href) return null;
  try {
    return new URL(href, GSM_BASE).toString();
  } catch {
    return null;
  }
}

/** Extract the numeric maker id from a "brand-phones-9.php" href. */
function brandIdFromHref(href) {
  const m = String(href || '').match(/-phones-(\d+)\.php/);
  return m ? Number(m[1]) : null;
}

/** Extract the device id from a "apple_iphone_17-14050.php" href. */
function deviceIdFromHref(href) {
  const m = String(href || '').match(/-(\d+)\.php/);
  return m ? Number(m[1]) : null;
}

/**
 * Parse the makers page (makers.php3) into a list of brands.
 * @returns {Array<{name,slug,brandId,listUrl,deviceCount}>}
 */
function parseBrands($) {
  const brands = [];
  // The makers page lists each brand twice (a sidebar quick-list and
  // the main table). De-duplicate by maker id, preferring the entry
  // that carries a device count (the main table).
  const byId = new Map();

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!/-phones-\d+\.php$/.test(href)) return;

    const $a = $(el);
    // "Acer<br><span>117 devices</span>" — name is the text node
    // before the <span>, device count lives in the <span>.
    const countText = clean($a.find('span').text());
    const deviceCount = Number((countText.match(/([\d,]+)/) || [])[1]?.replace(/,/g, '')) || null;

    // Remove the span so only the brand label text remains.
    const name = clean($a.clone().find('span').remove().end().text());
    if (!name) return;

    const brandId = brandIdFromHref(href);
    const entry = {
      name,
      slug: href.replace(/\.php$/, ''),
      brandId,
      listUrl: absUrl(href),
      deviceCount,
    };

    const key = brandId ?? entry.slug;
    const prev = byId.get(key);
    if (!prev || (deviceCount && !prev.deviceCount)) byId.set(key, entry);
  });

  for (const entry of byId.values()) brands.push(entry);
  return brands;
}

/**
 * Determine device type from the GSMArena list-item `title` summary
 * (e.g. "... smartphone. Announced ...", "... tablet.", "... watch.").
 */
function deviceTypeFromTitle(title) {
  const t = String(title || '').toLowerCase();
  if (/\bsmartwatch\b|\bwatch\b/.test(t)) return 'watch';
  if (/\btablet\b/.test(t)) return 'tablet';
  if (/\bsmartband\b|\bfitness band\b|\bband\b/.test(t)) return 'band';
  if (/\bsmartphone\b|\bphone\b/.test(t)) return 'phone';
  return 'other';
}

/**
 * Parse a brand's phone-list page into model summaries.
 * @param {object} opts { phonesOnly } when true, keep device_type === 'phone'.
 * @returns {Array<model summary>}
 */
function parseModelList($, { phonesOnly = true } = {}) {
  const models = [];
  $('.makers ul li a, div.makers li a').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    if (!/-\d+\.php$/.test(href)) return;

    const $img = $a.find('img');
    const title = $img.attr('title') || '';
    const deviceType = deviceTypeFromTitle(title);
    if (phonesOnly && deviceType !== 'phone') return;

    const name = clean($a.find('span').text()) || clean($a.text());
    models.push({
      name,
      slug: href.replace(/\.php$/, ''),
      deviceId: deviceIdFromHref(href),
      detailUrl: absUrl(href),
      thumb: $img.attr('src') || null,
      summary: clean(title),
      deviceType,
    });
  });
  return models;
}

/** Find the "Next page" URL on a paginated brand list, or null. */
function parseNextPageUrl($) {
  const href =
    $('a.prevnextbutton[title="Next page"]').attr('href') ||
    $('.nav-pages a[title="Next page"]').attr('href') ||
    null;
  return href ? absUrl(href) : null;
}

/**
 * Parse a device detail page into a fully structured phone record.
 * @param {object} ctx { brand, detailUrl } contextual hints.
 */
function parseDevice($, ctx = {}) {
  const modelName =
    clean($('h1[data-spec="modelname"]').text()) ||
    clean($('.specs-phone-name-title').text());
  if (!modelName) return null;

  // Main hero image.
  const imageUrl =
    $('.specs-photo-main a img').attr('src') ||
    $('.specs-photo-main img').attr('src') ||
    $('meta[property="og:image"]').attr('content') ||
    null;

  // Pictures sub-page link
  const picturesHref = $('a:contains("Pictures")').attr('href') ||
                       $('a[href*="-pictures-"]').attr('href');
  const picturesUrl = picturesHref ? absUrl(picturesHref) : null;

  // Header quick-specs (the highlight strip).
  const dataSpec = (name) => {
    const v = clean($(`[data-spec="${name}"]`).first().text());
    return v || null;
  };

  const quick = {
    released: dataSpec('released-hl'),
    body: dataSpec('body-hl'),
    os: dataSpec('os-hl'),
    storage: dataSpec('storage-hl'),
    displaySize: dataSpec('displaysize-hl'),
    displayRes: dataSpec('displayres-hl'),
    cameraPixels: dataSpec('camerapixels-hl'),
    ram: dataSpec('ramsize-hl'),
    chipset: dataSpec('chipset-hl'),
    battery: dataSpec('batsize-hl'),
    batteryType: dataSpec('battype-hl'),
  };

  // Full structured spec tables: { Section: { key: value } }.
  const specs = {};
  $('#specs-list table, .specs-list table, table').each((_, table) => {
    const $table = $(table);
    const section = clean($table.find('th').first().text());
    if (!section) return;

    if (!specs[section]) specs[section] = {};
    let lastKey = null;

    $table.find('tr').each((__, row) => {
      const $row = $(row);
      const $ttl = $row.find('td.ttl');
      const $nfo = $row.find('td.nfo');
      if ($nfo.length === 0) return;

      const key = clean($ttl.text());
      const val = clean($nfo.text());
      if (!val) return;

      if (key) {
        // Merge duplicate keys instead of overwriting.
        specs[section][key] = specs[section][key]
          ? `${specs[section][key]} ${val}`
          : val;
        lastKey = key;
      } else if (lastKey) {
        // Continuation line: append to the previous labelled value.
        specs[section][lastKey] = `${specs[section][lastKey]} ${val}`.trim();
      } else {
        // No label yet — stash under a generic key.
        specs[section]._ = specs[section]._ ? `${specs[section]._} ${val}` : val;
      }
    });

    if (Object.keys(specs[section]).length === 0) delete specs[section];
  });

  // Popularity ("4,419,931 hits") and daily-interest if present.
  let popularity = null;
  const hits = clean($('body').text()).match(/([\d,]+)\s*hits/i);
  if (hits) popularity = Number(hits[1].replace(/,/g, '')) || null;

  // Price hint (multi-currency string).
  const priceHint = dataSpec('price');

  // Release / status derived from the Launch section + quick strip.
  const launch = specs['Launch'] || {};
  const status = launch['Status'] || null;
  const announced = launch['Announced'] || null;
  const releaseYear = parseReleaseYear(quick.released || announced || status);

  const keySpecs = buildKeySpecs(quick, specs);

  return {
    brand: clean(ctx.brand) || guessBrand(modelName),
    modelName,
    slug: ctx.slug || null,
    deviceId: ctx.deviceId || deviceIdFromHref(ctx.detailUrl),
    detailUrl: ctx.detailUrl || null,
    picturesUrl,
    deviceType: 'phone',
    imageUrl,
    releaseYear,
    releaseDate: quick.released || announced || null,
    status,
    popularity,
    priceHint,
    quickSpecs: quick,
    keySpecs,
    specs,
  };
}

/** Best-effort 4-digit year extraction from a release/status string. */
function parseReleaseYear(text) {
  const m = String(text || '').match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

/** Fallback brand guess from the model name's first token. */
function guessBrand(modelName) {
  const first = clean(modelName).split(' ')[0];
  return first || null;
}

/**
 * Distil the flat, UI-friendly key specs from the quick strip and
 * full spec tables.
 */
function buildKeySpecs(quick, specs) {
  const network = specs['Network'] || {};
  const display = specs['Display'] || {};
  const platform = specs['Platform'] || {};
  const memory = specs['Memory'] || {};
  const mainCam = specs['Main Camera'] || {};
  const battery = specs['Battery'] || {};

  const cameraValue =
    Object.values(mainCam)[0] || (quick.cameraPixels ? `${quick.cameraPixels} MP` : null);

  return {
    ram: quick.ram ? `${quick.ram} GB` : null,
    storage: quick.storage || memory['Internal'] || null,
    chipset: quick.chipset || platform['Chipset'] || null,
    battery: quick.battery ? `${quick.battery} mAh` : battery['Type'] || null,
    display:
      display['Size'] || (quick.displaySize ? `${quick.displaySize}` : null),
    camera: cameraValue || null,
    os: quick.os || platform['OS'] || null,
    network: network['Technology'] || null,
  };
}

/** Extract all image URLs from a GSMArena pictures page. */
function parsePicturesPage($) {
  const pictures = [];
  $('#pictures-list img, .specs-photo-main img, .center-stage img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !pictures.includes(src)) pictures.push(src);
  });
  return pictures;
}

module.exports = {
  GSM_BASE,
  clean,
  absUrl,
  brandIdFromHref,
  deviceIdFromHref,
  deviceTypeFromTitle,
  parseBrands,
  parseModelList,
  parseNextPageUrl,
  parseDevice,
  parsePicturesPage,
  parseReleaseYear,
  buildKeySpecs,
};
