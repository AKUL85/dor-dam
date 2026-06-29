const axios = require('axios');
const cheerio = require('cheerio');

async function testSpecs() {
    try {
        const prodRes = await axios.get('https://gadgetbd.com/product/iphone-17-price-in-bangladesh/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const p$ = cheerio.load(prodRes.data);
        
        console.log("--- Additional Information Tab ---");
        p$('#tab-additional_information table tr').each((_, tr) => {
            console.log(p$(tr).text().trim().replace(/\s+/g, ' '));
        });
        
        console.log("--- Description Tab ---");
        // Look for any table in description
        p$('#tab-description table tr').each((_, tr) => {
            console.log(p$(tr).text().trim().replace(/\s+/g, ' '));
        });
        // Look for p or li tags
        p$('#tab-description p, #tab-description li').each((_, el) => {
            const txt = p$(el).text().trim();
            if(txt.length > 0 && txt.length < 100) console.log(txt);
        });

    } catch (err) {
        console.error("Error:", err.message);
    }
}
testSpecs();
