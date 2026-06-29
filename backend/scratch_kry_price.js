const Kry = require('./src/scraper/stores/KryInternationalScraper');
const k = new Kry();
k.load('https://kryinternational.com/products/huawei-mate-xt-ultimate').then($ => {
    const text = $('body').text();
    console.log("Full text matching 'Total Price':", text.match(/Total Price:[\s\S]{0,50}/i));
    console.log("Full text matching currency:", text.match(/[\d,]+\s*[৳]/i));
    
    let price = 0;
    $('*').each((_, el) => {
        const t = $(el).text().trim();
        if (t.includes('৳') && t.length < 50 && !$(el).children().length) {
            console.log("Found tag:", el.tagName, t);
        }
    });
}).catch(console.error);
