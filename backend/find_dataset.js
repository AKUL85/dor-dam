const axios = require('axios');

async function search() {
  try {
    const res = await axios.get('https://api.github.com/repos/foykes/gsm-arena-dataset/contents', {
      headers: { 'User-Agent': 'node.js' }
    });
    for (const file of res.data) {
      console.log(`- ${file.name} (${file.size} bytes)`);
    }
  } catch (err) {
    console.error(err.message);
  }
}
search();
