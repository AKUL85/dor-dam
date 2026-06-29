const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

const catHtml = fs.readFileSync('/home/alsaim/.gemini/antigravity/brain/38cd063e-0383-43fc-ab53-e4b55978b9b6/.system_generated/steps/48/content.md', 'utf8');
const prodHtml = fs.readFileSync('/home/alsaim/.gemini/antigravity/brain/38cd063e-0383-43fc-ab53-e4b55978b9b6/.system_generated/steps/49/content.md', 'utf8');

// Parse Category
let $ = cheerio.load(catHtml);
console.log("--- CATEGORY PARSING ---");
console.log("Pagination Next URL:", $('a.next.page-numbers').attr('href') || $('.pagination a.next').attr('href') || $('a.next').attr('href'));
const links = [];
$('.products .product').each((i, el) => {
    links.push($(el).find('a').first().attr('href'));
});
console.log(`Found ${links.length} products`);
console.log("Sample product link:", links[0]);

// Parse Product
$ = cheerio.load(prodHtml);
console.log("\n--- PRODUCT PARSING ---");
console.log("Name:", $('h1.product_title, h1.product-title, h1').first().text().trim());
console.log("Image URL:", $('.woocommerce-product-gallery__image img').first().attr('src') || $('img').first().attr('src'));
console.log("Price text:", $('.price').first().text().replace(/\s+/g, ' ').trim());
console.log("Original Price:", $('.price del').text().trim());
console.log("Current Price:", $('.price ins').text().trim() || $('.price').clone().children('del').remove().end().text().trim());
console.log("Stock:", $('.stock').text().trim() || $('.in-stock').text().trim());
console.log("Category:", $('.posted_in a').first().text().trim());
console.log("Description:", $('.woocommerce-Tabs-panel--description').text().replace(/\s+/g, ' ').substring(0, 100));

console.log("\nSpecs Table rows:");
$('.woocommerce-product-attributes tr, .shop_attributes tr, table tr').slice(0, 5).each((i, el) => {
    const key = $(el).find('th').text().trim() || $(el).find('td').first().text().trim();
    const val = $(el).find('td').last().text().trim();
    console.log(`- ${key}: ${val}`);
});
