"use client";

import { useState } from "react";

interface FeedPost {
  id: number;
  author: string;
  avatar: string;
  time: string;
  title: string;
  body: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
}

const initialPosts: FeedPost[] = [
  {
    id: 1,
    author: "DorDam Team",
    avatar: "DD",
    time: "2 hours ago",
    title: "Samsung Galaxy A27 now available in Bangladesh!",
    body: "The Samsung Galaxy A27 has officially landed in Bangladesh. Starting at ৳22,999, it features a 6.7\" Super AMOLED display, 50MP camera, and 5000mAh battery. Check prices across stores on DorDam.",
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a25.jpg",
    likes: 47,
    comments: 12,
    shares: 8,
    liked: false,
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
    liked: false,
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
    liked: false,
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
    liked: false,
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
    liked: false,
  },
];

export default function CommunityFeed() {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);

  const toggleLike = (id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  return (
    <section id="news-feed" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
          News & Community Feed
        </h3>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {posts.map((post) => (
          <article key={post.id} className="p-4 transition-colors hover:bg-[var(--bg-card-hover)]">
            {/* Author row */}
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                {post.avatar}
              </div>
              <div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{post.author}</span>
                <span className="ml-2 text-[11px] text-[var(--text-muted)]">{post.time}</span>
              </div>
            </div>

            {/* Content */}
            <h4 className="mb-1.5 text-base font-bold text-[var(--text-primary)] leading-snug">
              {post.title}
            </h4>
            <p className="mb-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {post.body}
            </p>

            {/* Image */}
            {post.image && (
              <div className="mb-3 overflow-hidden rounded-lg bg-[var(--bg-secondary)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image}
                  alt={post.title}
                  className="h-[200px] w-full object-cover opacity-90 transition-opacity hover:opacity-100"
                />
              </div>
            )}

            {/* Actions: Like, Comment, Share */}
            <div className="flex items-center gap-6 pt-1">
              {/* Like */}
              <button
                onClick={() => toggleLike(post.id)}
                className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  post.liked
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--accent)]"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={post.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                <span>{post.likes}</span>
              </button>

              {/* Comment */}
              <button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{post.comments}</span>
              </button>

              {/* Share */}
              <button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>{post.shares}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
