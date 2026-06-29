const fs = require('fs');
const cheerio = require('cheerio');
const catHtml = fs.readFileSync('/home/alsaim/.gemini/antigravity/brain/38cd063e-0383-43fc-ab53-e4b55978b9b6/.system_generated/steps/48/content.md', 'utf8');
const $ = cheerio.load(catHtml);

console.log("Looking for products:");
const products = $('.product, .product-small, .product-type-simple');
console.log("Products found:", products.length);

if (products.length > 0) {
  const first = products.first();
  console.log("First product classes:", first.attr('class'));
  console.log("First product link:", first.find('a').attr('href'));
} else {
  // Just dump all links to see if they look like product links
  const links = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('/product/')) links.push(href);
  });
  console.log("Links containing /product/:", links.slice(0, 10));
}

console.log("\nLooking for pagination:");
console.log("Pagination links:");
$('.pagination a, .page-numbers').each((i, el) => {
  console.log($(el).attr('href'));
});

