import type { Metadata } from "next";
import NewsFeed from "./NewsFeed";

export const metadata: Metadata = {
  title: "News — DorDam",
  description: "Latest mobile phone news, price drops, launches, and updates in Bangladesh",
};

const newsArticles = [
  {
    id: "1",
    title: "Samsung Galaxy A27 now available in Bangladesh at ৳22,999",
    body: "The Samsung Galaxy A27 has officially launched in Bangladesh. Featuring a 6.7\" Super AMOLED display, 50MP triple camera, Exynos 1380 chipset, and 5000mAh battery, it's positioned as a strong mid-ranger. Available at all authorized retailers and online stores.",
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
    id: "2",
    title: "Price Drop Alert: Xiaomi Redmi Note 13 Pro drops ৳2,000",
    body: "Great news for budget buyers! The Redmi Note 13 Pro has seen a ৳2,000 price drop across multiple retailers this week. Now starting at ৳28,999, it's one of the best value phones in the segment with its 200MP camera and AMOLED display.",
    category: "Price Drop",
    author: "DorDam Team",
    date: "Jul 7, 2026",
    readTime: "1 min",
    likes: 83,
    comments: 24,
    shares: 15,
  },
  {
    id: "3",
    title: "iPhone 18 Pro leaked specs: Thicker body, A19 Pro chip confirmed",
    body: "Multiple reliable leakers have confirmed that the iPhone 18 Pro will feature a thicker body to accommodate a significantly larger battery. The A19 Pro chip is expected to deliver 40% improved AI performance. Launch expected in September 2026.",
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
    id: "4",
    title: "Samsung Galaxy Unpacked confirmed for July 22",
    body: "Samsung has officially sent out invitations for the next Galaxy Unpacked event on July 22. The Galaxy Z Fold 8, Z Flip 8, Galaxy Watch 8, and Galaxy Ring 2 are all expected to be announced.",
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
    id: "5",
    title: "Best phones under ৳15,000 — July 2026 updated guide",
    body: "Our monthly buyer's guide for the budget segment is updated. We compare Realme C67, Redmi 14C, Samsung Galaxy A16, and Infinix Hot 50 across camera, performance, battery, and display to help you find the best value.",
    category: "Guide",
    author: "DorDam Team",
    date: "Jul 5, 2026",
    readTime: "5 min",
    likes: 56,
    comments: 18,
    shares: 11,
  },
  {
    id: "6",
    title: "Nothing Phone (4b) launched with Snapdragon 6 Gen 4 and Glyph Bar",
    body: "Nothing has launched the Phone (4b) globally with the Snapdragon 6 Gen 4 processor, 6.5\" OLED display, signature Glyph interface, and 50MP dual camera. Priced at $349, it should arrive in Bangladesh within weeks.",
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
    id: "7",
    title: "Google Pixel 11 series launch date officially revealed",
    body: "Google has confirmed that the Pixel 11 and Pixel 11 Pro will launch on August 12, 2026. The Tensor G5 chip promises breakthrough on-device AI capabilities including real-time translation and photo enhancement.",
    category: "Launch",
    author: "DorDam Team",
    date: "Jul 3, 2026",
    readTime: "2 min",
    likes: 67,
    comments: 21,
    shares: 14,
  },
  {
    id: "8",
    title: "Realme GT 7 Pro arrives in BD — ৳44,999 with Snapdragon 8 Gen 3",
    body: "Realme has officially brought the GT 7 Pro to Bangladesh. Featuring Snapdragon 8 Gen 3, 6.78\" 2K AMOLED at 120Hz, 50MP Sony IMX890 camera with OIS, and 100W charging with 5500mAh battery.",
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
    id: "9",
    title: "Xiaomi Redmi K90 Ultra goes official with Snapdragon 8 Elite",
    body: "Xiaomi's latest flagship killer, the Redmi K90 Ultra, is now official. It packs the Snapdragon 8 Elite chip, 6.67\" 2K LTPO display, 50MP Leica camera, and a massive 6000mAh battery with 120W charging.",
    category: "Launch",
    author: "DorDam Team",
    date: "Jul 1, 2026",
    readTime: "3 min",
    likes: 112,
    comments: 38,
    shares: 25,
  },
  {
    id: "10",
    title: "Infinix Hot 50 Pro+ now cheapest 5G phone in Bangladesh",
    body: "Infinix has slashed the price of the Hot 50 Pro+ to ৳12,499, making it the most affordable 5G phone in Bangladesh. Features include MediaTek Dimensity 6300, 6.7\" display, and 5000mAh battery.",
    category: "Price Drop",
    author: "DorDam Team",
    date: "Jun 30, 2026",
    readTime: "1 min",
    likes: 45,
    comments: 15,
    shares: 9,
  },
];

export default function NewsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">News</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Latest phone launches, price drops, and tech updates in Bangladesh
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Category:</span>
          <select className="rounded-md border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]">
            <option value="all">All</option>
            <option value="launch">Launches</option>
            <option value="price-drop">Price Drops</option>
            <option value="rumor">Rumors</option>
            <option value="guide">Guides</option>
            <option value="event">Events</option>
          </select>
        </div>
      </div>

      {/* News Feed */}
      <NewsFeed articles={newsArticles} />
    </div>
  );
}
