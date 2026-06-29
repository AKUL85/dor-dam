const axios = require('axios');
const cheerio = require('cheerio');

async function testSpecs() {
    try {
        const prodRes = await axios.get('https://gadgetbd.com/product/iphone-17-price-in-bangladesh/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const p$ = cheerio.load(prodRes.data);
        
        console.log("All tables:");
        p$('table').each((i, table) => {
            console.log(`Table ${i}:`);
            p$(table).find('tr').each((_, tr) => {
                console.log("  ", p$(tr).text().trim().replace(/\s+/g, ' '));
            });
        });
        
        console.log("\nTrying to find typical spec keywords:");
        const content = p$('body').text();
        console.log("Has 'Display':", content.includes('Display'));
        console.log("Has 'Camera':", content.includes('Camera'));
        console.log("Has 'Battery':", content.includes('Battery'));

    } catch (err) {
        console.error("Error:", err.message);
    }
}
testSpecs();
