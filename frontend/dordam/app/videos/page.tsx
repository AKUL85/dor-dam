import type { Metadata } from "next";
import VideoGrid from "./VideoGrid";

export const metadata: Metadata = {
  title: "Videos — DorDam",
  description: "Watch official DorDam.com videos: phone comparisons, buyer's guides, unboxings, and price updates",
};

const videos = [
  {
    id: "v1",
    title: "Samsung Galaxy A27 vs Xiaomi Redmi Note 13 Pro — কোনটা ভালো?",
    description: "Full comparison between Samsung Galaxy A27 and Xiaomi Redmi Note 13 Pro. We compare camera, display, performance, battery life, and value for money in Bangladesh.",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a25.jpg",
    category: "Comparison",
    views: "45K",
    date: "Jul 7, 2026",
    duration: "14:32",
  },
  {
    id: "v2",
    title: "Best Phones Under ৳20,000 in Bangladesh — July 2026",
    description: "Our top 5 picks for the best phones under 20,000 taka. Budget phones with the best cameras, displays, and batteries available right now.",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note13-pro-5g.jpg",
    category: "Buyer's Guide",
    views: "78K",
    date: "Jul 5, 2026",
    duration: "18:45",
  },
  {
    id: "v3",
    title: "Nothing Phone (4b) Unboxing & First Impressions — Bangladesh Price",
    description: "Unboxing the Nothing Phone (4b) in Bangladesh. First look at the Glyph Bar, Snapdragon 6 Gen 4 performance, and camera quality. Plus official Bangladesh pricing.",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/nothing-phone2a.jpg",
    category: "Unboxing",
    views: "32K",
    date: "Jul 4, 2026",
    duration: "11:20",
  },
  {
    id: "v4",
    title: "iPhone 15 Pro Max — Still Worth It in 2026?",
    description: "The iPhone 15 Pro Max is now cheaper than launch. But is it still worth buying in Bangladesh in 2026? We discuss price, performance, and alternatives.",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg",
    category: "Discussion",
    views: "120K",
    date: "Jul 3, 2026",
    duration: "16:08",
  },
  {
    id: "v5",
    title: "Phone Price Update — July 2026 Week 1 | Samsung, Xiaomi, Realme",
    description: "Weekly phone price update for Bangladesh. All the latest price changes for Samsung, Xiaomi, Realme, Oppo, and more. Check DorDam.com for live prices.",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/realme-gt5-pro.jpg",
    category: "Price Update",
    views: "56K",
    date: "Jul 2, 2026",
    duration: "8:55",
  },
  {
    id: "v6",
    title: "Realme GT 7 Pro Full Review — ৳44,999 এ Flagship?",
    description: "Full detailed review of Realme GT 7 Pro in Bangladesh. Snapdragon 8 Gen 3, 2K display, Sony IMX890 camera — is this the best flagship value?",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/realme-gt5-pro.jpg",
    category: "Review",
    views: "89K",
    date: "Jun 30, 2026",
    duration: "22:14",
  },
  {
    id: "v7",
    title: "Top 5 Camera Phones Under ৳30,000 in BD — 2026",
    description: "Best camera phones you can buy under 30,000 taka in Bangladesh. Sample photos, video quality comparison, and night mode test included.",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/oppo-reno11-pro.jpg",
    category: "Buyer's Guide",
    views: "67K",
    date: "Jun 28, 2026",
    duration: "15:40",
  },
  {
    id: "v8",
    title: "Samsung Galaxy S25 Ultra vs OnePlus 15 — Flagship Battle",
    description: "The ultimate flagship comparison in Bangladesh. Samsung Galaxy S25 Ultra vs OnePlus 15 across camera, display, S-Pen productivity, gaming, and battery.",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-702.jpg",
    category: "Comparison",
    views: "145K",
    date: "Jun 26, 2026",
    duration: "20:33",
  },
  {
    id: "v9",
    title: "How to Use DorDam.com — Find the Best Phone Prices in BD",
    description: "A quick tutorial on how to use DorDam.com to find and compare phone prices across all stores in Bangladesh. Save money on your next phone purchase!",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-ultra.jpg",
    category: "Tutorial",
    views: "23K",
    date: "Jun 24, 2026",
    duration: "6:12",
  },
];

export default function VideosPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Videos</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Official DorDam.com videos — comparisons, buyer&apos;s guides, unboxings & price updates
          </p>
        </div>
        <a
          href="https://www.youtube.com/@dordam"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-red-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
          </svg>
          Subscribe on YouTube
        </a>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["All", "Comparison", "Buyer's Guide", "Review", "Unboxing", "Price Update", "Tutorial", "Discussion"].map((cat) => (
          <button
            key={cat}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
              cat === "All"
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      <VideoGrid videos={videos} />
    </div>
  );
}
