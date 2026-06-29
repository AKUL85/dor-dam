const axios = require('axios');
async function explore() {
  try {
    const res = await axios.get('https://kryinternational.com/products/category/phone', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = res.data;
    
    const matches = [...html.matchAll(/"slug":"([^"]+)"/g)];
    const slugs = matches.map(m => m[1]);
    console.log("Slugs found:", [...new Set(slugs)].slice(0, 10));
    
    // Also try looking for something that looks like an API endpoint
    const apiMatches = [...html.matchAll(/https:\/\/api[^"]+/g)];
    console.log("API URLs found:", [...new Set(apiMatches.map(m => m[0]))].slice(0, 5));
    
  } catch(e) {
    console.error(e.message);
  }
}
explore();
