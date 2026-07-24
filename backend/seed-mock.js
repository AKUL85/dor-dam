const fs = require('fs');
const path = require('path');

const brands = [
  "Samsung", "Apple", "Huawei", "Nokia", "Sony", "LG", "HTC", "Motorola", "Lenovo",
  "Xiaomi", "Google", "Honor", "Oppo", "Realme", "OnePlus", "vivo", "Meizu", "Asus",
  "ZTE", "Infinix", "TCL", "Ulefone", "Tecno", "Doogee", "Blackview", "Cubot", "Oukitel", "Itel"
].map((name, i) => ({
  name,
  slug: `${name.toLowerCase()}-phones-${i + 1}`,
  brandId: i + 1,
  listUrl: `https://www.gsmarena.com/${name.toLowerCase()}-phones-${i + 1}.php`,
  deviceCount: Math.floor(Math.random() * 500) + 50,
  phoneCount: Math.floor(Math.random() * 300) + 20,
}));

const mockPhones = [
  { brand: "Apple", name: "iPhone 15 Pro Max", image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg" },
  { brand: "Apple", name: "iPhone 15 Pro", image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro.jpg" },
  { brand: "Apple", name: "iPhone 14", image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14.jpg" },
  { brand: "Samsung", name: "Galaxy S24 Ultra", image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-5g-sm-s928-u1.jpg" },
  { brand: "Samsung", name: "Galaxy S24", image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-5g-sm-s921.jpg" },
  { brand: "Samsung", name: "Galaxy A55", image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a55.jpg" },
  { brand: "Xiaomi", name: "14 Ultra", image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-ultra.jpg" },
  { brand: "Xiaomi", name: "Redmi Note 13 Pro+", image: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro-plus-5g.jpg" },
  { brand: "Google", name: "Pixel 8 Pro", image: "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8-pro.jpg" },
  { brand: "Google", name: "Pixel 8a", image: "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8a.jpg" },
  { brand: "OnePlus", name: "12", image: "https://fdn2.gsmarena.com/vv/bigpic/oneplus-12.jpg" },
  { brand: "Tecno", name: "Pova 6 Pro", image: "https://fdn2.gsmarena.com/vv/bigpic/tecno-pova-6-pro.jpg" },
  { brand: "Motorola", name: "Edge 50 Pro", image: "https://fdn2.gsmarena.com/vv/bigpic/motorola-edge-50-pro.jpg" },
  { brand: "Nothing", name: "Phone (2a)", image: "https://fdn2.gsmarena.com/vv/bigpic/nothing-phone-2a.jpg" }
];

const phones = mockPhones.map((p, i) => {
  const slug = `${p.brand.toLowerCase()}_${p.name.toLowerCase().replace(/ /g, '_')}-${1000 + i}`;
  return {
    brand: p.brand,
    modelName: p.name,
    slug,
    deviceId: 1000 + i,
    detailUrl: `https://www.gsmarena.com/${slug}.php`,
    deviceType: "phone",
    imageUrl: p.image,
    thumb: p.image,
    releaseYear: 2024,
    releaseDate: "Released 2024",
    status: "Available",
    popularity: Math.floor(Math.random() * 5000000) + 1000000,
    priceHint: "$ 999.00 / € 1,199.00",
    quickSpecs: {
      released: "Released 2024",
      body: "200g, 8mm thickness",
      os: "Android 14",
      storage: "256GB storage, no card slot",
      displaySize: "6.7\"",
      displayRes: "1440x3200 pixels",
      cameraPixels: "50",
      ram: "12",
      chipset: "Snapdragon 8 Gen 3",
      battery: "5000",
      batteryType: "Li-Po"
    },
    keySpecs: {
      ram: "12 GB",
      storage: "256GB storage",
      chipset: "Snapdragon 8 Gen 3",
      battery: "5000 mAh",
      display: "6.7 inches",
      camera: "50 MP",
      os: "Android 14",
      network: "GSM / HSPA / LTE / 5G"
    },
    specs: {}
  };
});

const catalog = {
  source: 'gsmarena.com',
  generatedAt: new Date().toISOString(),
  durationMs: 1200,
  totalBrands: brands.length,
  totalPhones: phones.length,
  brands,
  phones,
  errors: []
};

const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'gsmarena-catalog-latest.json'), JSON.stringify(catalog, null, 2));
console.log(`Generated mock catalog with ${brands.length} brands and ${phones.length} phones.`);
