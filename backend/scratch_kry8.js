const axios = require('axios');
const fs = require('fs');
async function explore() {
  try {
    const res = await axios.get('https://kryinternational.com/products/category/phone', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    fs.writeFileSync('kry_category.html', res.data);
    console.log("Saved to kry_category.html");
  } catch(e) {
    console.error(e.message);
  }
}
explore();
