const Kry = require('./src/scraper/stores/KryInternationalScraper');
const k = new Kry();
k.load('https://kryinternational.com/products/huawei-mate-xt-ultimate').then($ => {
    let price = 0;
    
    // First try to find elements with "Total Price" specifically
    $('*').each((_, el) => {
       const text = $(el).text().trim();
       if (text.toLowerCase().includes('total price') && text.includes('৳') && text.length < 50 && $(el).children().length === 0) {
           const match = text.match(/([\d,]+)/);
           if (match && parseInt(match[1].replace(/,/g, ''), 10) > 100) {
               price = parseInt(match[1].replace(/,/g, ''), 10);
           }
       }
    });

    if (!price) {
        $('*').each((_, el) => {
           const text = $(el).text().trim();
           if ((text.includes('৳') || text.toLowerCase().includes('tk')) && text.length < 50 && $(el).children().length === 0) {
               const match = text.match(/([\d,]+)/);
               if (match && parseInt(match[1].replace(/,/g, ''), 10) > 1000) {
                   price = parseInt(match[1].replace(/,/g, ''), 10);
               }
           }
        });
    }
    console.log("Extracted Price:", price);
}).catch(console.error);
