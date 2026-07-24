// ─────────────────────────────────────────────────────────────
//  Mock news data + async accessors.
//
//  Components import ONLY the accessor functions (getNews, getNewsArticle),
//  never the raw array. When the real API lands, replace the bodies of
//  these accessors with fetch() calls — component code stays untouched.
// ─────────────────────────────────────────────────────────────
import type { NewsArticle } from "./types";

export const newsArticles: NewsArticle[] = [
  {
    slug: "samsung-galaxy-a27-available-bangladesh",
    title: "Samsung Galaxy A27 now available in Bangladesh at ৳22,999",
    excerpt:
      "The Samsung Galaxy A27 has officially launched in Bangladesh with a 6.7\" Super AMOLED display and 50MP triple camera.",
    body: "The Samsung Galaxy A27 has officially launched in Bangladesh. Featuring a 6.7\" Super AMOLED display, 50MP triple camera, Exynos 1380 chipset, and 5000mAh battery, it's positioned as a strong mid-ranger.\n\nAvailable at all authorized retailers and online stores, the device targets buyers looking for a premium display experience without stepping into flagship pricing.\n\nEarly impressions praise the bright panel and clean One UI software, though the plastic frame is a reminder of its mid-range positioning.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a25.jpg",
    category: "Launch",
    author: "DorDam Team",
    date: "Jul 8, 2026",
    readTime: "2 min",
    likes: 47,
    comments: 12,
    shares: 8,
  },
  {
    slug: "redmi-note-13-pro-price-drop",
    title: "Price Drop Alert: Xiaomi Redmi Note 13 Pro drops ৳2,000",
    excerpt:
      "The Redmi Note 13 Pro has seen a ৳2,000 price drop across multiple retailers this week.",
    body: "Great news for budget buyers! The Redmi Note 13 Pro has seen a ৳2,000 price drop across multiple retailers this week. Now starting at ৳28,999, it's one of the best value phones in the segment with its 200MP camera and AMOLED display.\n\nThe drop appears to be a response to increased mid-range competition, and stock is reported to be healthy across major stores.",
    category: "Price Drop",
    author: "DorDam Team",
    date: "Jul 7, 2026",
    readTime: "1 min",
    likes: 83,
    comments: 24,
    shares: 15,
  },
  {
    slug: "iphone-18-pro-leaked-specs",
    title: "iPhone 18 Pro leaked specs: Thicker body, A19 Pro chip confirmed",
    excerpt:
      "Multiple leakers confirm the iPhone 18 Pro will feature a thicker body for a larger battery.",
    body: "Multiple reliable leakers have confirmed that the iPhone 18 Pro will feature a thicker body to accommodate a significantly larger battery. The A19 Pro chip is expected to deliver 40% improved AI performance.\n\nLaunch is expected in September 2026, in line with Apple's usual cadence. The thicker chassis marks a reversal of the thinness-at-all-costs trend of recent years.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg",
    category: "Rumor",
    author: "DorDam Team",
    date: "Jul 6, 2026",
    readTime: "3 min",
    likes: 124,
    comments: 45,
    shares: 32,
  },
  {
    slug: "samsung-galaxy-unpacked-july-22",
    title: "Samsung Galaxy Unpacked confirmed for July 22",
    excerpt:
      "Samsung has officially sent out invitations for the next Galaxy Unpacked event on July 22.",
    body: "Samsung has officially sent out invitations for the next Galaxy Unpacked event on July 22. The Galaxy Z Fold 8, Z Flip 8, Galaxy Watch 8, and Galaxy Ring 2 are all expected to be announced.\n\nFoldables are expected to headline the show, with rumours pointing to a thinner Fold and improved crease durability.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-702.jpg",
    category: "Event",
    author: "DorDam Team",
    date: "Jul 6, 2026",
    readTime: "2 min",
    likes: 201,
    comments: 56,
    shares: 41,
  },
  {
    slug: "best-phones-under-15000-july-2026",
    title: "Best phones under ৳15,000 — July 2026 updated guide",
    excerpt:
      "Our monthly buyer's guide for the budget segment is updated for July 2026.",
    body: "Our monthly buyer's guide for the budget segment is updated. We compare Realme C67, Redmi 14C, Samsung Galaxy A16, and Infinix Hot 50 across camera, performance, battery, and display to help you find the best value.\n\nThis month the Redmi 14C edges ahead on raw performance, while the Galaxy A16 wins on software support longevity.",
    category: "Guide",
    author: "DorDam Team",
    date: "Jul 5, 2026",
    readTime: "5 min",
    likes: 56,
    comments: 18,
    shares: 11,
  },
  {
    slug: "nothing-phone-4b-launched",
    title: "Nothing Phone (4b) launched with Snapdragon 6 Gen 4 and Glyph Bar",
    excerpt:
      "Nothing has launched the Phone (4b) globally with the Snapdragon 6 Gen 4 processor and signature Glyph interface.",
    body: "Nothing has launched the Phone (4b) globally with the Snapdragon 6 Gen 4 processor, 6.5\" OLED display, signature Glyph interface, and 50MP dual camera. Priced at $349, it should arrive in Bangladesh within weeks.\n\nThe Glyph Bar returns with new notification patterns, and Nothing OS remains one of the cleaner Android skins available.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/nothing-phone2a.jpg",
    category: "Launch",
    author: "DorDam Team",
    date: "Jul 4, 2026",
    readTime: "3 min",
    likes: 91,
    comments: 33,
    shares: 19,
  },
  {
    slug: "google-pixel-11-launch-date",
    title: "Google Pixel 11 series launch date officially revealed",
    excerpt:
      "Google has confirmed that the Pixel 11 and Pixel 11 Pro will launch on August 12, 2026.",
    body: "Google has confirmed that the Pixel 11 and Pixel 11 Pro will launch on August 12, 2026. The Tensor G5 chip promises breakthrough on-device AI capabilities including real-time translation and photo enhancement.\n\nGoogle is leaning further into AI-first features, with several Pixel-exclusive capabilities expected at launch.",
    category: "Launch",
    author: "DorDam Team",
    date: "Jul 3, 2026",
    readTime: "2 min",
    likes: 67,
    comments: 21,
    shares: 14,
  },
  {
    slug: "realme-gt-7-pro-bangladesh",
    title: "Realme GT 7 Pro arrives in BD — ৳44,999 with Snapdragon 8 Gen 3",
    excerpt:
      "Realme has officially brought the GT 7 Pro to Bangladesh with Snapdragon 8 Gen 3 and 100W charging.",
    body: "Realme has officially brought the GT 7 Pro to Bangladesh. Featuring Snapdragon 8 Gen 3, 6.78\" 2K AMOLED at 120Hz, 50MP Sony IMX890 camera with OIS, and 100W charging with 5500mAh battery.\n\nAt ৳44,999 it undercuts several flagship rivals while matching them on core performance.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/realme-gt5-pro.jpg",
    category: "Launch",
    author: "DorDam Team",
    date: "Jul 2, 2026",
    readTime: "2 min",
    likes: 74,
    comments: 29,
    shares: 17,
  },
  {
    slug: "redmi-k90-ultra-official",
    title: "Xiaomi Redmi K90 Ultra goes official with Snapdragon 8 Elite",
    excerpt:
      "Xiaomi's latest flagship killer, the Redmi K90 Ultra, is now official.",
    body: "Xiaomi's latest flagship killer, the Redmi K90 Ultra, is now official. It packs the Snapdragon 8 Elite chip, 6.67\" 2K LTPO display, 50MP Leica camera, and a massive 6000mAh battery with 120W charging.\n\nThe K-series continues to punch above its price, though global availability remains uncertain.",
    category: "Launch",
    author: "DorDam Team",
    date: "Jul 1, 2026",
    readTime: "3 min",
    likes: 112,
    comments: 38,
    shares: 25,
  },
  {
    slug: "infinix-hot-50-pro-plus-cheapest-5g",
    title: "Infinix Hot 50 Pro+ now cheapest 5G phone in Bangladesh",
    excerpt:
      "Infinix has slashed the price of the Hot 50 Pro+ to ৳12,499, making it the most affordable 5G phone in Bangladesh.",
    body: "Infinix has slashed the price of the Hot 50 Pro+ to ৳12,499, making it the most affordable 5G phone in Bangladesh. Features include MediaTek Dimensity 6300, 6.7\" display, and 5000mAh battery.\n\nThe price makes 5G accessible at the entry level, a notable milestone for the Bangladesh market.",
    category: "Price Drop",
    author: "DorDam Team",
    date: "Jun 30, 2026",
    readTime: "1 min",
    likes: 45,
    comments: 15,
    shares: 9,
  },
];

