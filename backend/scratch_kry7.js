const axios = require('axios');
async function explore() {
  try {
    const res = await axios.get('https://api.kryinternational.com/products?category=phone', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    console.log("Status:", res.status);
    console.log("Data keys:", Object.keys(res.data));
    if (res.data.products) console.log("Products:", res.data.products.length);
    if (res.data.data) console.log("Data:", Array.isArray(res.data.data) ? res.data.data.length : Object.keys(res.data.data));
  } catch(e) {
    console.error("1:", e.message);
  }
  
  try {
    const res = await axios.get('https://api.kryinternational.com/api/v1/products', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    console.log("Status:", res.status);
    console.log("Data keys:", Object.keys(res.data));
  } catch(e) {
    console.error("2:", e.message);
  }
}
explore();
