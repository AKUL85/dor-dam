const axios = require('axios');
const cheerio = require('cheerio');
const { parsePrice } = require('./src/utils/parsers');

async function testSpecs() {
    try {
        const prodRes = await axios.get('https://gadgetbd.com/product/iphone-17-price-in-bangladesh/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const p$ = cheerio.load(prodRes.data);
        
        let pText = p$('.price').text().replace(/\s+/g, ' ');
        console.log("Price text:", pText);
        
        // try variations form
        const formVariations = p$('form.variations_form').attr('data-product_variations');
        if (formVariations) {
            const variations = JSON.parse(formVariations);
            console.log("Variations available:", variations.length);
            if (variations.length > 0) {
                console.log("First variation price:", variations[0].display_price);
            }
        }
        
    } catch (err) {
        console.error("Error:", err.message);
    }
}
testSpecs();
