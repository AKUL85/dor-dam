const axios = require('axios');
const cheerio = require('cheerio');
const { parsePrice } = require('./src/utils/parsers');

async function testSpecs() {
    try {
        const prodRes = await axios.get('https://gadgetbd.com/product/iphone-17-price-in-bangladesh/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const p$ = cheerio.load(prodRes.data);
        
        let pText = p$('.price').first().text().trim();
        console.log("Price text:", pText);
        
        // Try to get more specific price from simple variable product wrapper if present
        let scriptData = p$('script[type="application/ld+json"]').text();
        if (scriptData) {
            // Can be multiple scripts
            p$('script[type="application/ld+json"]').each((_, s) => {
                try {
                    let d = JSON.parse(p$(s).text());
                    if(d['@graph']) d = d['@graph'].find(x => x['@type'] === 'Product') || d;
                    if(d['@type'] === 'Product' && d.offers) {
                        let offer = Array.isArray(d.offers) ? d.offers[0] : d.offers;
                        console.log("LD+JSON Price:", offer.price);
                    }
                } catch(e) {}
            });
        }
        
    } catch (err) {
        console.error("Error:", err.message);
    }
}
testSpecs();
