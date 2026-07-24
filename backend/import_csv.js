const fs = require('fs');
const path = require('path');
const https = require('https');
const csv = require('csv-parser');

const CSV_URL = 'https://raw.githubusercontent.com/foykes/gsm-arena-dataset/master/gsm_arena_full_dataset.csv';
const OUTPUT_FILE = path.join(__dirname, 'output', 'gsmarena-catalog-latest.json');

async function downloadCSV(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function generateSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function extractYear(announced) {
  const match = announced.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function parseCSV() {
  const brandsMap = new Map();
  const phones = [];

  fs.createReadStream('dataset.csv')
    .pipe(csv())
    .on('data', (row) => {
      const brandRaw = row['Brand'];
      const modelNameRaw = row['Model Name'];
      if (!brandRaw || !modelNameRaw) return;

      const brand = brandRaw.charAt(0).toUpperCase() + brandRaw.slice(1);
      const modelName = modelNameRaw;
      
      const brandSlug = generateSlug(brand);
      const phoneSlug = generateSlug(`${brand}_${modelName}`);

      if (!brandsMap.has(brandSlug)) {
        brandsMap.set(brandSlug, {
          name: brand,
          slug: brandSlug,
          brandId: brandSlug,
          listUrl: '',
          deviceCount: 0,
          phoneCount: 0
        });
      }
      
      const b = brandsMap.get(brandSlug);
      b.deviceCount++;
      b.phoneCount++;

      const specs = [];
      const addSpec = (category, mapping) => {
        const catSpecs = [];
        for (const [name, col] of Object.entries(mapping)) {
          if (row[col] && row[col].trim() !== '') {
            catSpecs.push({ name, value: row[col].trim() });
          }
        }
        if (catSpecs.length > 0) {
          specs.push({ category, specs: catSpecs });
        }
      };

      addSpec('Network', {
        'Technology': 'Technology',
        '2G bands': '2G bands',
        '3G bands': '3G bands',
        '4G bands': '4G bands',
        '5G bands': '5G bands',
        'Speed': 'Speed'
      });
      addSpec('Launch', {
        'Announced': 'Announced',
        'Status': 'Status'
      });
      addSpec('Body', {
        'Dimensions': 'Dimensions',
        'Weight': 'Weight',
        'Build': 'Build',
        'SIM': 'SIM'
      });
      addSpec('Display', {
        'Type': 'Type',
        'Size': 'Size',
        'Resolution': 'Resolution',
        'Protection': 'Protection'
      });
      addSpec('Platform', {
        'OS': 'OS',
        'Chipset': 'Chipset',
        'CPU': 'CPU',
        'GPU': 'GPU'
      });
      addSpec('Memory', {
        'Card slot': 'Card slot',
        'Internal': 'Internal'
      });
      addSpec('Main Camera', {
        'Quad': 'Quad',
        'Triple': 'Triple',
        'Dual': 'Dual',
        'Single': 'Single',
        'Features': 'Features',
        'Video': 'Video'
      });
      addSpec('Selfie camera', {
        'Single': 'Single_1',
        'Dual': 'Dual_1',
        'Features': 'Features_1',
        'Video': 'Video_1'
      });
      addSpec('Sound', {
        'Loudspeaker': 'Loudspeaker',
        '3.5mm jack': '3.5mm jack'
      });
      addSpec('Comms', {
        'WLAN': 'WLAN',
        'Bluetooth': 'Bluetooth',
        'GPS': 'GPS',
        'NFC': 'NFC',
        'Radio': 'Radio',
        'USB': 'USB'
      });
      addSpec('Features', {
        'Sensors': 'Sensors'
      });
      addSpec('Battery', {
        'Type': 'Type_1',
        'Charging': 'Charging'
      });
      addSpec('Misc', {
        'Colors': 'Colors',
        'Models': 'Models',
        'SAR': 'SAR',
        'Price': 'Price'
      });

      const imageUrl = row['Model Image'] || '';
      
      const phone = {
        brand: brand,
        brandSlug: brandSlug,
        modelName: modelName,
        slug: phoneSlug,
        deviceId: phoneSlug,
        detailUrl: '',
        imageUrl: imageUrl,
        thumb: imageUrl,
        pictures: [imageUrl],
        releaseYear: extractYear(row['Announced'] || ''),
        popularity: Math.floor(Math.random() * 100), 
        keySpecs: {
          displaySize: row['Size'] ? row['Size'].split(',')[0] : '',
          cameraMegapixels: row['Quad'] || row['Triple'] || row['Dual'] || row['Single'] || '',
          ram: row['Internal'] ? row['Internal'].split(',')[0] : '',
          batteryCapacity: row['Type_1'] ? row['Type_1'].split(',')[0] : ''
        },
        specs: specs
      };

      phones.push(phone);
    })
    .on('end', () => {
      console.log(`Processed ${phones.length} phones.`);
      const catalog = {
        source: 'GSMArena Dataset (github)',
        generatedAt: new Date().toISOString(),
        totalBrands: brandsMap.size,
        totalPhones: phones.length,
        brands: Array.from(brandsMap.values()),
        phones: phones,
        errors: []
      };

      if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
      }
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2), 'utf8');
      console.log(`Saved catalog to ${OUTPUT_FILE}`);
    });
}

async function run() {
  console.log('Downloading CSV...');
  await downloadCSV(CSV_URL, 'dataset.csv');
  console.log('Parsing CSV...');
  parseCSV();
}

run();
