const axios = require('axios');
const cheerio = require('cheerio');

async function discover() {
    try {
        const res = await axios.get('https://gadgetbd.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const $ = cheerio.load(res.data);
        
        console.log("--- Links containing 'mobile' or 'phone' ---");
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim().toLowerCase();
            if (href && (href.toLowerCase().includes('mobile') || href.toLowerCase().includes('phone') || text.includes('mobile') || text.includes('phone'))) {
                console.log(text, '=>', href);
            }
        });
        
    } catch (err) {
        console.error("Error fetching homepage:", err.message);
    }
}
discover();
