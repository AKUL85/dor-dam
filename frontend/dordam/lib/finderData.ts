// ─────────────────────────────────────────────────────────────
//  finderData.ts — Dummy data + option lists for the GSMArena-
//  style "Phone Finder" page. Lives on the client so the form
//  can filter without a backend round-trip.
//
//  Palette-wise this file is neutral; the red/grey theme and
//  hover treatments are applied in FinderClient + primitives.
// ─────────────────────────────────────────────────────────────

export type Phone = {
  id: string;
  name: string;
  brand: string;
  imageEmoji: string;
  released: number; // year
  network: Array<"2G" | "3G" | "4G" | "5G">;
  dimensions: { h: number; w: number; d: number }; // mm
  weightG: number;
  build: "Glass" | "Plastic" | "Metal" | "Glass/Metal";
  sim: "Single" | "Dual" | "Dual + eSIM" | "eSIM only";
  displayType: "IPS LCD" | "AMOLED" | "LTPO AMOLED" | "PLS LCD";
  sizeIn: number;
  resW: number;
  resH: number;
  refreshHz: 60 | 90 | 120 | 144;
  os: "Android" | "iOS" | "HarmonyOS" | "Windows";
  chipset: string;
  cpuCores: 4 | 6 | 8;
  ramGB: number;
  storageGB: number;
  cardSlot: boolean;
  mainCamMP: number;
  videoRes: "720p" | "1080p" | "4K" | "8K";
  selfieCamMP: number;
  battMAh: number;
  chargingW: number;
  jack35: boolean;
  formFactor: "Bar" | "Foldable" | "Flip";
  priceUSD: number;
};

// ── All dropdown / checkbox options ──────────────────────────
export const NETWORK_OPTIONS = ["2G", "3G", "4G", "5G"] as const;

export const DISPLAY_TYPES = [
  "Any",
  "IPS LCD",
  "AMOLED",
  "LTPO AMOLED",
  "PLS LCD",
] as const;

export const OS_OPTIONS = ["Android", "iOS", "HarmonyOS", "Windows"] as const;

export const CHIPSET_BRANDS = [
  "Any",
  "Qualcomm Snapdragon",
  "Apple A-Series",
  "MediaTek Dimensity",
  "Samsung Exynos",
  "HiSilicon Kirin",
  "Unisoc",
] as const;

export const SIM_OPTIONS = [
  "Any",
  "Single",
  "Dual",
  "Dual + eSIM",
  "eSIM only",
] as const;

export const BUILD_OPTIONS = [
  "Any",
  "Glass",
  "Plastic",
  "Metal",
  "Glass/Metal",
] as const;

export const FORM_FACTORS = ["Bar", "Foldable", "Flip"] as const;

export const VIDEO_RES_OPTIONS = ["720p", "1080p", "4K", "8K"] as const;

export const REFRESH_RATES = [60, 90, 120, 144] as const;

export const PRICE_RANGES: Array<{ label: string; min: number; max: number }> = [
  { label: "Any price", min: 0, max: 9999 },
  { label: "Under $100", min: 0, max: 99 },
  { label: "$100 – $300", min: 100, max: 300 },
  { label: "$300 – $600", min: 300, max: 600 },
  { label: "$600 – $1000", min: 600, max: 1000 },
  { label: "Over $1000", min: 1000, max: 9999 },
];

// ── 30 dummy phones covering every filter field ──────────────
export const PHONES: Phone[] = [
  { id: "p1", name: "Galaxy S25 Ultra", brand: "Samsung", imageEmoji: "📱", released: 2025, network: ["2G","3G","4G","5G"], dimensions: { h: 162.8, w: 77.6, d: 8.2 }, weightG: 218, build: "Glass/Metal", sim: "Dual + eSIM", displayType: "LTPO AMOLED", sizeIn: 6.9, resW: 1440, resH: 3120, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8 Elite", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 200, videoRes: "8K", selfieCamMP: 12, battMAh: 5000, chargingW: 45, jack35: false, formFactor: "Bar", priceUSD: 1299 },
  { id: "p2", name: "iPhone 17 Pro Max", brand: "Apple", imageEmoji: "🍎", released: 2025, network: ["2G","3G","4G","5G"], dimensions: { h: 163.0, w: 77.6, d: 8.3 }, weightG: 231, build: "Glass/Metal", sim: "eSIM only", displayType: "LTPO AMOLED", sizeIn: 6.9, resW: 1320, resH: 2868, refreshHz: 120, os: "iOS", chipset: "Apple A19 Pro", cpuCores: 6, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 48, videoRes: "4K", selfieCamMP: 24, battMAh: 5088, chargingW: 35, jack35: false, formFactor: "Bar", priceUSD: 1499 },
  { id: "p3", name: "iPhone 16", brand: "Apple", imageEmoji: "🍎", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 147.6, w: 71.6, d: 7.8 }, weightG: 170, build: "Glass/Metal", sim: "eSIM only", displayType: "AMOLED", sizeIn: 6.1, resW: 1179, resH: 2556, refreshHz: 60, os: "iOS", chipset: "Apple A18", cpuCores: 6, ramGB: 8, storageGB: 128, cardSlot: false, mainCamMP: 48, videoRes: "4K", selfieCamMP: 12, battMAh: 3561, chargingW: 20, jack35: false, formFactor: "Bar", priceUSD: 799 },
  { id: "p4", name: "Pixel 10 Pro", brand: "Google", imageEmoji: "🟦", released: 2025, network: ["2G","3G","4G","5G"], dimensions: { h: 152.8, w: 72.0, d: 8.5 }, weightG: 199, build: "Glass/Metal", sim: "Dual + eSIM", displayType: "LTPO AMOLED", sizeIn: 6.3, resW: 1280, resH: 2856, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8 Elite", cpuCores: 8, ramGB: 16, storageGB: 256, cardSlot: false, mainCamMP: 50, videoRes: "4K", selfieCamMP: 11, battMAh: 4870, chargingW: 30, jack35: false, formFactor: "Bar", priceUSD: 999 },
  { id: "p5", name: "Galaxy A55", brand: "Samsung", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 161.1, w: 77.4, d: 8.2 }, weightG: 213, build: "Glass", sim: "Dual", displayType: "AMOLED", sizeIn: 6.6, resW: 1080, resH: 2340, refreshHz: 120, os: "Android", chipset: "Samsung Exynos 1480", cpuCores: 8, ramGB: 8, storageGB: 128, cardSlot: true, mainCamMP: 50, videoRes: "4K", selfieCamMP: 32, battMAh: 5000, chargingW: 25, jack35: false, formFactor: "Bar", priceUSD: 379 },
  { id: "p6", name: "Galaxy Z Fold 7", brand: "Samsung", imageEmoji: "📲", released: 2025, network: ["2G","3G","4G","5G"], dimensions: { h: 158.4, w: 143.2, d: 4.2 }, weightG: 239, build: "Glass/Metal", sim: "Dual + eSIM", displayType: "LTPO AMOLED", sizeIn: 8.0, resW: 1968, resH: 2184, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8 Elite", cpuCores: 8, ramGB: 12, storageGB: 512, cardSlot: false, mainCamMP: 200, videoRes: "8K", selfieCamMP: 10, battMAh: 4400, chargingW: 25, jack35: false, formFactor: "Foldable", priceUSD: 1999 },
  { id: "p7", name: "Galaxy Z Flip 6", brand: "Samsung", imageEmoji: "🤳", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 85.1, w: 71.9, d: 6.9 }, weightG: 187, build: "Glass/Metal", sim: "Dual + eSIM", displayType: "AMOLED", sizeIn: 6.7, resW: 1080, resH: 2640, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8 Gen 3", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 50, videoRes: "4K", selfieCamMP: 10, battMAh: 4000, chargingW: 25, jack35: false, formFactor: "Flip", priceUSD: 1099 },
  { id: "p8", name: "Xiaomi 15 Pro", brand: "Xiaomi", imageEmoji: "📱", released: 2025, network: ["2G","3G","4G","5G"], dimensions: { h: 161.3, w: 75.3, d: 8.4 }, weightG: 218, build: "Glass/Metal", sim: "Dual", displayType: "LTPO AMOLED", sizeIn: 6.73, resW: 1440, resH: 3200, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8 Elite", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 50, videoRes: "8K", selfieCamMP: 32, battMAh: 6100, chargingW: 90, jack35: false, formFactor: "Bar", priceUSD: 899 },
  { id: "p9", name: "Redmi Note 14 Pro+", brand: "Xiaomi", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 162.5, w: 74.7, d: 8.7 }, weightG: 210, build: "Glass", sim: "Dual", displayType: "AMOLED", sizeIn: 6.67, resW: 1220, resH: 2712, refreshHz: 120, os: "Android", chipset: "MediaTek Dimensity", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: true, mainCamMP: 200, videoRes: "4K", selfieCamMP: 20, battMAh: 6200, chargingW: 120, jack35: true, formFactor: "Bar", priceUSD: 399 },
  { id: "p10", name: "OnePlus 13", brand: "OnePlus", imageEmoji: "📱", released: 2025, network: ["2G","3G","4G","5G"], dimensions: { h: 162.9, w: 76.5, d: 8.5 }, weightG: 213, build: "Glass/Metal", sim: "Dual", displayType: "LTPO AMOLED", sizeIn: 6.82, resW: 1440, resH: 3168, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8 Elite", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 50, videoRes: "8K", selfieCamMP: 32, battMAh: 6000, chargingW: 100, jack35: false, formFactor: "Bar", priceUSD: 899 },
  { id: "p11", name: "Nothing Phone (3)", brand: "Nothing", imageEmoji: "🪟", released: 2025, network: ["2G","3G","4G","5G"], dimensions: { h: 160.6, w: 76.0, d: 8.2 }, weightG: 195, build: "Glass", sim: "Dual", displayType: "AMOLED", sizeIn: 6.67, resW: 1080, resH: 2400, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8s Gen 3", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 50, videoRes: "4K", selfieCamMP: 32, battMAh: 5000, chargingW: 50, jack35: false, formFactor: "Bar", priceUSD: 599 },
  { id: "p12", name: "Honor 200 Pro", brand: "Honor", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 163.3, w: 75.2, d: 8.2 }, weightG: 199, build: "Glass", sim: "Dual", displayType: "AMOLED", sizeIn: 6.78, resW: 1224, resH: 2700, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8s Gen 3", cpuCores: 8, ramGB: 12, storageGB: 512, cardSlot: false, mainCamMP: 50, videoRes: "4K", selfieCamMP: 50, battMAh: 5200, chargingW: 100, jack35: false, formFactor: "Bar", priceUSD: 549 },
  { id: "p13", name: "Huawei Mate 70 Pro", brand: "Huawei", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 157.6, w: 75.8, d: 7.9 }, weightG: 202, build: "Glass/Metal", sim: "Dual", displayType: "LTPO AMOLED", sizeIn: 6.7, resW: 1216, resH: 2688, refreshHz: 120, os: "HarmonyOS", chipset: "HiSilicon Kirin", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 50, videoRes: "4K", selfieCamMP: 13, battMAh: 5300, chargingW: 88, jack35: false, formFactor: "Bar", priceUSD: 1199 },
  { id: "p14", name: "Realme GT 6", brand: "Realme", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 162.0, w: 75.1, d: 8.4 }, weightG: 199, build: "Glass", sim: "Dual", displayType: "LTPO AMOLED", sizeIn: 6.78, resW: 1264, resH: 2780, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8s Gen 3", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 50, videoRes: "4K", selfieCamMP: 32, battMAh: 5500, chargingW: 120, jack35: false, formFactor: "Bar", priceUSD: 549 },
  { id: "p15", name: "Oppo Find X8", brand: "Oppo", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 157.4, w: 74.3, d: 7.9 }, weightG: 193, build: "Glass/Metal", sim: "Dual", displayType: "LTPO AMOLED", sizeIn: 6.59, resW: 1256, resH: 2760, refreshHz: 120, os: "Android", chipset: "MediaTek Dimensity", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 50, videoRes: "4K", selfieCamMP: 32, battMAh: 5630, chargingW: 80, jack35: false, formFactor: "Bar", priceUSD: 799 },
  { id: "p16", name: "Vivo X100 Ultra", brand: "Vivo", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 164.1, w: 75.6, d: 9.2 }, weightG: 229, build: "Glass/Metal", sim: "Dual", displayType: "LTPO AMOLED", sizeIn: 6.78, resW: 1440, resH: 3200, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8 Gen 3", cpuCores: 8, ramGB: 16, storageGB: 512, cardSlot: false, mainCamMP: 50, videoRes: "8K", selfieCamMP: 50, battMAh: 5500, chargingW: 100, jack35: false, formFactor: "Bar", priceUSD: 999 },
  { id: "p17", name: "Motorola Edge 50", brand: "Motorola", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 160.8, w: 71.2, d: 7.8 }, weightG: 180, build: "Plastic", sim: "Dual", displayType: "LTPO AMOLED", sizeIn: 6.55, resW: 1220, resH: 2712, refreshHz: 144, os: "Android", chipset: "Qualcomm Snapdragon 7 Gen 3", cpuCores: 8, ramGB: 12, storageGB: 512, cardSlot: false, mainCamMP: 50, videoRes: "4K", selfieCamMP: 50, battMAh: 5000, chargingW: 68, jack35: false, formFactor: "Bar", priceUSD: 549 },
  { id: "p18", name: "Nokia G42", brand: "Nokia", imageEmoji: "📱", released: 2023, network: ["2G","3G","4G","5G"], dimensions: { h: 165.0, w: 75.8, d: 8.6 }, weightG: 193, build: "Plastic", sim: "Dual", displayType: "IPS LCD", sizeIn: 6.56, resW: 720, resH: 1612, refreshHz: 90, os: "Android", chipset: "Unisoc", cpuCores: 8, ramGB: 6, storageGB: 128, cardSlot: true, mainCamMP: 50, videoRes: "1080p", selfieCamMP: 8, battMAh: 5000, chargingW: 20, jack35: true, formFactor: "Bar", priceUSD: 149 },
  { id: "p19", name: "Tecno Camon 30", brand: "Tecno", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G"], dimensions: { h: 163.4, w: 75.2, d: 7.9 }, weightG: 192, build: "Plastic", sim: "Dual", displayType: "AMOLED", sizeIn: 6.78, resW: 1080, resH: 2436, refreshHz: 120, os: "Android", chipset: "MediaTek Dimensity", cpuCores: 8, ramGB: 8, storageGB: 256, cardSlot: true, mainCamMP: 50, videoRes: "1080p", selfieCamMP: 50, battMAh: 5000, chargingW: 70, jack35: true, formFactor: "Bar", priceUSD: 219 },
  { id: "p20", name: "Infinix Note 40", brand: "Infinix", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G"], dimensions: { h: 164.1, w: 74.6, d: 7.6 }, weightG: 190, build: "Plastic", sim: "Dual", displayType: "AMOLED", sizeIn: 6.78, resW: 1080, resH: 2436, refreshHz: 120, os: "Android", chipset: "MediaTek Dimensity", cpuCores: 8, ramGB: 8, storageGB: 256, cardSlot: true, mainCamMP: 108, videoRes: "1440p" as never, selfieCamMP: 32, battMAh: 5000, chargingW: 33, jack35: true, formFactor: "Bar", priceUSD: 249 },
  { id: "p21", name: "Galaxy A15", brand: "Samsung", imageEmoji: "📱", released: 2023, network: ["2G","3G","4G"], dimensions: { h: 160.1, w: 76.8, d: 8.4 }, weightG: 200, build: "Plastic", sim: "Dual", displayType: "PLS LCD", sizeIn: 6.5, resW: 1080, resH: 2340, refreshHz: 90, os: "Android", chipset: "MediaTek Dimensity", cpuCores: 8, ramGB: 4, storageGB: 128, cardSlot: true, mainCamMP: 50, videoRes: "1080p", selfieCamMP: 13, battMAh: 5000, chargingW: 25, jack35: true, formFactor: "Bar", priceUSD: 159 },
  { id: "p22", name: "Galaxy A25", brand: "Samsung", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 161.0, w: 76.5, d: 8.4 }, weightG: 197, build: "Plastic", sim: "Dual", displayType: "AMOLED", sizeIn: 6.5, resW: 1080, resH: 2340, refreshHz: 120, os: "Android", chipset: "Samsung Exynos", cpuCores: 8, ramGB: 6, storageGB: 128, cardSlot: true, mainCamMP: 50, videoRes: "4K", selfieCamMP: 13, battMAh: 5000, chargingW: 25, jack35: true, formFactor: "Bar", priceUSD: 249 },
  { id: "p23", name: "Redmi 14C", brand: "Xiaomi", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G"], dimensions: { h: 168.0, w: 78.0, d: 8.2 }, weightG: 204, build: "Plastic", sim: "Dual", displayType: "IPS LCD", sizeIn: 6.88, resW: 720, resH: 1640, refreshHz: 60, os: "Android", chipset: "MediaTek Dimensity", cpuCores: 4, ramGB: 4, storageGB: 128, cardSlot: true, mainCamMP: 50, videoRes: "1080p", selfieCamMP: 13, battMAh: 5160, chargingW: 18, jack35: true, formFactor: "Bar", priceUSD: 119 },
  { id: "p24", name: "Honor X9b", brand: "Honor", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 163.6, w: 75.5, d: 7.9 }, weightG: 185, build: "Glass", sim: "Dual", displayType: "AMOLED", sizeIn: 6.78, resW: 1220, resH: 2652, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 6 Gen 1", cpuCores: 8, ramGB: 8, storageGB: 256, cardSlot: false, mainCamMP: 108, videoRes: "4K", selfieCamMP: 16, battMAh: 5800, chargingW: 35, jack35: false, formFactor: "Bar", priceUSD: 279 },
  { id: "p25", name: "Galaxy S25", brand: "Samsung", imageEmoji: "📱", released: 2025, network: ["2G","3G","4G","5G"], dimensions: { h: 146.9, w: 70.5, d: 7.2 }, weightG: 162, build: "Glass/Metal", sim: "Dual + eSIM", displayType: "LTPO AMOLED", sizeIn: 6.2, resW: 1080, resH: 2340, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 8 Elite", cpuCores: 8, ramGB: 12, storageGB: 128, cardSlot: false, mainCamMP: 50, videoRes: "8K", selfieCamMP: 12, battMAh: 4000, chargingW: 25, jack35: false, formFactor: "Bar", priceUSD: 799 },
  { id: "p26", name: "Huawei Pura 70", brand: "Huawei", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G"], dimensions: { h: 157.6, w: 74.3, d: 8.0 }, weightG: 197, build: "Glass", sim: "Dual", displayType: "LTPO AMOLED", sizeIn: 6.6, resW: 1256, resH: 2760, refreshHz: 120, os: "HarmonyOS", chipset: "HiSilicon Kirin", cpuCores: 8, ramGB: 12, storageGB: 256, cardSlot: false, mainCamMP: 50, videoRes: "4K", selfieCamMP: 13, battMAh: 4900, chargingW: 66, jack35: false, formFactor: "Bar", priceUSD: 799 },
  { id: "p27", name: "Galaxy M35", brand: "Samsung", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 162.3, w: 78.6, d: 9.1 }, weightG: 222, build: "Plastic", sim: "Dual", displayType: "AMOLED", sizeIn: 6.6, resW: 1080, resH: 2340, refreshHz: 120, os: "Android", chipset: "Samsung Exynos 1380", cpuCores: 8, ramGB: 8, storageGB: 256, cardSlot: true, mainCamMP: 50, videoRes: "4K", selfieCamMP: 13, battMAh: 6000, chargingW: 25, jack35: true, formFactor: "Bar", priceUSD: 299 },
  { id: "p28", name: "iPhone SE 4", brand: "Apple", imageEmoji: "🍎", released: 2025, network: ["2G","3G","4G","5G"], dimensions: { h: 138.7, w: 64.8, d: 7.8 }, weightG: 144, build: "Glass/Metal", sim: "eSIM only", displayType: "AMOLED", sizeIn: 6.1, resW: 1170, resH: 2532, refreshHz: 60, os: "iOS", chipset: "Apple A18", cpuCores: 6, ramGB: 8, storageGB: 128, cardSlot: false, mainCamMP: 48, videoRes: "4K", selfieCamMP: 12, battMAh: 3279, chargingW: 20, jack35: false, formFactor: "Bar", priceUSD: 499 },
  { id: "p29", name: "Pixel 8a", brand: "Google", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G","5G"], dimensions: { h: 152.1, w: 72.7, d: 8.9 }, weightG: 188, build: "Plastic", sim: "Dual + eSIM", displayType: "AMOLED", sizeIn: 6.1, resW: 1080, resH: 2400, refreshHz: 120, os: "Android", chipset: "Qualcomm Snapdragon 7 Gen 3", cpuCores: 8, ramGB: 8, storageGB: 128, cardSlot: false, mainCamMP: 64, videoRes: "4K", selfieCamMP: 13, battMAh: 4492, chargingW: 18, jack35: false, formFactor: "Bar", priceUSD: 379 },
  { id: "p30", name: "Realme C67", brand: "Realme", imageEmoji: "📱", released: 2024, network: ["2G","3G","4G"], dimensions: { h: 165.6, w: 76.1, d: 7.9 }, weightG: 190, build: "Plastic", sim: "Dual", displayType: "IPS LCD", sizeIn: 6.72, resW: 1080, resH: 2400, refreshHz: 90, os: "Android", chipset: "Unisoc", cpuCores: 8, ramGB: 6, storageGB: 128, cardSlot: true, mainCamMP: 108, videoRes: "1080p", selfieCamMP: 8, battMAh: 5000, chargingW: 33, jack35: true, formFactor: "Bar", priceUSD: 139 },
];

// ── Filter predicate (pure) ─────────────────────────────────
export type Filters = {
  network: Array<"2G" | "3G" | "4G" | "5G">;
  yearMin: number;
  yearMax: number;
  dimensionMax: number;
  weightMax: number;
  build: string; // "Any" | Phone["build"]
  sim: string;   // "Any" | Phone["sim"]
  displayType: string; // "Any" | Phone["displayType"]
  sizeMin: number;
  sizeMax: number;
  refreshMin: number;
  os: Array<typeof OS_OPTIONS[number]>;
  chipset: string;
  cpuCoresMin: number;
  ramMin: number;
  storageMin: number;
  cardSlot: boolean;
  mainCamMin: number;
  videoRes: string;
  selfieCamMin: number;
  battMin: number;
  chargingMin: number;
  jack: "any" | "yes" | "no";
  formFactor: string; // "Any" | Phone["formFactor"]
  priceMin: number;
  priceMax: number;
};

export const DEFAULT_FILTERS: Filters = {
  network: [],
  yearMin: 2015,
  yearMax: new Date().getFullYear(),
  dimensionMax: 200,
  weightMax: 500,
  build: "Any",
  sim: "Any",
  displayType: "Any",
  sizeMin: 0,
  sizeMax: 10,
  refreshMin: 0,
  os: [],
  chipset: "Any",
  cpuCoresMin: 0,
  ramMin: 0,
  storageMin: 0,
  cardSlot: false,
  mainCamMin: 0,
  videoRes: "Any",
  selfieCamMin: 0,
  battMin: 0,
  chargingMin: 0,
  jack: "any",
  formFactor: "Any",
  priceMin: 0,
  priceMax: 9999,
};

export function applyFilters(phones: Phone[], f: Filters): Phone[] {
  return phones.filter((p) => {
    // Network checkboxes: phone must support ALL selected networks.
    if (f.network.length > 0 && !f.network.every((n) => p.network.includes(n))) return false;
    if (p.released < f.yearMin || p.released > f.yearMax) return false;
    if (p.dimensions.d > f.dimensionMax) return false;
    if (p.weightG > f.weightMax) return false;
    if (f.build !== "Any" && p.build !== f.build) return false;
    if (f.sim !== "Any" && p.sim !== f.sim) return false;
    if (f.displayType !== "Any" && p.displayType !== f.displayType) return false;
    if (p.sizeIn < f.sizeMin || p.sizeIn > f.sizeMax) return false;
    if (p.refreshHz < f.refreshMin) return false;
    if (f.os.length > 0 && !f.os.includes(p.os)) return false;
    if (f.chipset !== "Any" && !p.chipset.toLowerCase().includes(f.chipset.toLowerCase())) return false;
    if (p.cpuCores < f.cpuCoresMin) return false;
    if (p.ramGB < f.ramMin) return false;
    if (p.storageGB < f.storageMin) return false;
    if (f.cardSlot && !p.cardSlot) return false;
    if (p.mainCamMP < f.mainCamMin) return false;
    if (f.videoRes !== "Any" && p.videoRes !== f.videoRes) return false;
    if (p.selfieCamMP < f.selfieCamMin) return false;
    if (p.battMAh < f.battMin) return false;
    if (p.chargingW < f.chargingMin) return false;
    if (f.jack === "yes" && !p.jack35) return false;
    if (f.jack === "no" && p.jack35) return false;
    if (f.formFactor !== "Any" && p.formFactor !== f.formFactor) return false;
    if (p.priceUSD < f.priceMin || p.priceUSD > f.priceMax) return false;
    return true;
  });
}
