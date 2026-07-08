import type { Metadata } from "next";
import ReviewGrid from "./ReviewGrid";

export const metadata: Metadata = {
  title: "Phone Reviews — DorDam",
  description: "Watch phone review videos from top tech influencers in Bangladesh and worldwide",
};

const reviews = [
  {
    id: "1",
    phone: "Samsung Galaxy A27",
    brand: "Samsung",
    influencer: "Sohag360",
    channelAvatar: "S3",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a25.jpg",
    views: "245K",
    date: "Jul 5, 2026",
    duration: "12:34",
  },
  {
    id: "2",
    phone: "Xiaomi Redmi Note 13 Pro",
    brand: "Xiaomi",
    influencer: "Tech Boss BD",
    channelAvatar: "TB",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note13-pro-5g.jpg",
    views: "189K",
    date: "Jul 3, 2026",
    duration: "15:22",
  },
  {
    id: "3",
    phone: "iPhone 15 Pro Max",
    brand: "Apple",
    influencer: "MKBHD",
    channelAvatar: "MK",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg",
    views: "5.2M",
    date: "Jun 28, 2026",
    duration: "18:45",
  },
  {
    id: "4",
    phone: "Oppo Reno16 Pro",
    brand: "Oppo",
    influencer: "GadgetByte BD",
    channelAvatar: "GB",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/oppo-reno11-pro.jpg",
    views: "98K",
    date: "Jul 1, 2026",
    duration: "10:18",
  },
  {
    id: "5",
    phone: "Nothing Phone (4b)",
    brand: "Nothing",
    influencer: "Dave2D",
    channelAvatar: "D2",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/nothing-phone2a.jpg",
    views: "1.8M",
    date: "Jul 6, 2026",
    duration: "9:56",
  },
  {
    id: "6",
    phone: "Realme GT 7 Pro",
    brand: "Realme",
    influencer: "Bangla Tech Zone",
    channelAvatar: "BT",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/realme-gt5-pro.jpg",
    views: "312K",
    date: "Jun 30, 2026",
    duration: "14:07",
  },
  {
    id: "7",
    phone: "Samsung Galaxy S25 Ultra",
    brand: "Samsung",
    influencer: "Unbox Therapy",
    channelAvatar: "UT",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-702.jpg",
    views: "3.1M",
    date: "Jun 25, 2026",
    duration: "11:33",
  },
  {
    id: "8",
    phone: "Tecno Pova 8",
    brand: "Tecno",
    influencer: "Phone BD",
    channelAvatar: "PB",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/tecno-pova-6-pro-5g.jpg",
    views: "67K",
    date: "Jul 4, 2026",
    duration: "8:44",
  },
  {
    id: "9",
    phone: "Motorola Razr Fold",
    brand: "Motorola",
    influencer: "Mrwhosetheboss",
    channelAvatar: "MW",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/motorola-razr-50-ultra.jpg",
    views: "4.7M",
    date: "Jul 2, 2026",
    duration: "16:21",
  },
  {
    id: "10",
    phone: "OnePlus 15",
    brand: "OnePlus",
    influencer: "Gadget Insider BD",
    channelAvatar: "GI",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/oneplus-12r.jpg",
    views: "156K",
    date: "Jun 29, 2026",
    duration: "13:09",
  },
  {
    id: "11",
    phone: "Xiaomi 17 Ultra",
    brand: "Xiaomi",
    influencer: "Linus Tech Tips",
    channelAvatar: "LT",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-ultra.jpg",
    views: "2.4M",
    date: "Jun 27, 2026",
    duration: "20:15",
  },
  {
    id: "12",
    phone: "Honor Magic V6",
    brand: "Honor",
    influencer: "JerryRigEverything",
    channelAvatar: "JR",
    videoId: "dQw4w9WgXcQ",
    thumbnail: "https://fdn2.gsmarena.com/vv/bigpic/honor-magic-v3.jpg",
    views: "890K",
    date: "Jul 7, 2026",
    duration: "7:48",
  },
];

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Phone Reviews</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Watch review videos from top tech influencers worldwide
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Filter:</span>
          <select className="rounded-md border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]">
            <option value="all">All Brands</option>
            <option value="samsung">Samsung</option>
            <option value="apple">Apple</option>
            <option value="xiaomi">Xiaomi</option>
            <option value="oppo">Oppo</option>
            <option value="realme">Realme</option>
            <option value="nothing">Nothing</option>
            <option value="oneplus">OnePlus</option>
          </select>
          <select className="rounded-md border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]">
            <option value="latest">Latest</option>
            <option value="popular">Most Viewed</option>
          </select>
        </div>
      </div>

      {/* Review Grid */}
      <ReviewGrid reviews={reviews} />
    </div>
  );
}
