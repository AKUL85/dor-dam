// ─────────────────────────────────────────────────────────────
//  Editorial content data layer — the single seam between the UI
//  and its data source.
//
//  TODAY: every accessor resolves from the local mock modules.
//  LATER: replace each function body with a real `fetch()` to the
//  backend. Because the accessors are already async and return the
//  same types, NO component needs to change when that happens.
//
//  Components MUST import from here — never from the raw mock
//  modules and never with inline arrays.
// ─────────────────────────────────────────────────────────────
import { newsArticles } from "./news";
import { reviews } from "./reviews";
import { videos } from "./videos";
import { communityPosts } from "./community";
import type { NewsArticle, Review, Video, CommunityPost } from "./types";

export type { NewsArticle, Review, Video, CommunityPost } from "./types";

// ── News ─────────────────────────────────────────────────────

export async function getNews(): Promise<NewsArticle[]> {
  return newsArticles;
}

/** Return the most recent `limit` articles for sidebars/related sections. */
export async function getLatestNews(limit = 5): Promise<NewsArticle[]> {
  return newsArticles.slice(0, limit);
}

export async function getNewsArticle(slug: string): Promise<NewsArticle | null> {
  return newsArticles.find((a) => a.slug === slug) ?? null;
}

/** Related articles (same category, excluding the current slug). */
export async function getRelatedNews(slug: string, limit = 4): Promise<NewsArticle[]> {
  const current = newsArticles.find((a) => a.slug === slug);
  if (!current) return newsArticles.slice(0, limit);
  const sameCategory = newsArticles.filter(
    (a) => a.slug !== slug && a.category === current.category
  );
  const others = newsArticles.filter(
    (a) => a.slug !== slug && a.category !== current.category
  );
  return [...sameCategory, ...others].slice(0, limit);
}

// ── Reviews ──────────────────────────────────────────────────

export async function getReviews(): Promise<Review[]> {
  return reviews;
}

export async function getReview(slug: string): Promise<Review | null> {
  return reviews.find((r) => r.slug === slug) ?? null;
}

// ── Videos ───────────────────────────────────────────────────

export async function getVideos(): Promise<Video[]> {
  return videos;
}

export async function getVideo(slug: string): Promise<Video | null> {
  return videos.find((v) => v.slug === slug) ?? null;
}

// ── Community ────────────────────────────────────────────────

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  return communityPosts;
}
