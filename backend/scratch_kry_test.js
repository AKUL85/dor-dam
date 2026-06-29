const Kry = require('./src/scraper/stores/KryInternationalScraper');
const k = new Kry();
k.collectProductUrls().then(console.log).catch(console.error);
