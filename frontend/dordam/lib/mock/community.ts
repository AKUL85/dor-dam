// ─────────────────────────────────────────────────────────────
//  Mock community/news-feed posts. Dummy content for now; the
//  real API will return this same shape later.
// ─────────────────────────────────────────────────────────────
import type { CommunityPost } from "./types";

export const communityPosts: CommunityPost[] = [
  {
    id: 1,
    author: "DorDam Team",
    avatar: "DD",
    time: "2 hours ago",
    title: "Samsung Galaxy A27 now available in Bangladesh!",
    body: 'The Samsung Galaxy A27 has officially landed in Bangladesh. Starting at ৳22,999, it features a 6.7" Super AMOLED display, 50MP camera, and 5000mAh battery. Check prices across stores on DorDam.',
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a25.jpg",
    likes: 47,
    comments: 12,
    shares: 8,
  },
  {
    id: 2,
    author: "DorDam Team",
    avatar: "DD",
    time: "5 hours ago",
    title: "Price Drop Alert: Xiaomi Redmi Note 13 Pro",
    body: "Great news for budget buyers! The Redmi Note 13 Pro has dropped ৳2,000 at multiple stores this week. Now starting at ৳28,999. Best time to grab one.",
    likes: 83,
    comments: 24,
    shares: 15,
  },
  {
    id: 3,
    author: "DorDam Team",
    avatar: "DD",
    time: "8 hours ago",
    title: "iPhone 18 Pro rumored specs leaked",
    body: "The iPhone 18 Pro is expected to feature a larger battery, thicker body, and the A19 Pro chip. We'll update DorDam with full specs as soon as it's official.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg",
    likes: 124,
    comments: 45,
    shares: 32,
  },
  {
    id: 4,
    author: "DorDam Team",
    avatar: "DD",
    time: "12 hours ago",
    title: "Best phones under ৳15,000 — July 2026 update",
    body: "Our updated buyer's guide for the budget segment is live! We compare Realme C67, Redmi 14C, Samsung Galaxy A16, and Infinix Hot 50 to help you pick the best value.",
    likes: 56,
    comments: 18,
    shares: 11,
  },
  {
    id: 5,
    author: "DorDam Team",
    avatar: "DD",
    time: "1 day ago",
    title: "Nothing Phone (4b) — Should you buy it in BD?",
    body: "Nothing Phone (4b) brings the Glyph Bar experience with Snapdragon 6 Gen 4 at a competitive price. Here's our take on whether it's worth importing or waiting for official availability.",
    likes: 91,
    comments: 33,
    shares: 19,
  },
];
