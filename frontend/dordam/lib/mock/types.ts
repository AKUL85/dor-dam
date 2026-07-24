// ─────────────────────────────────────────────────────────────
//  Editorial content types (news, reviews, videos, community).
//  These describe the *dummy* content shapes today, but they are
//  the same shapes the real API will return later — so swapping
//  the mock accessors in ./ for real fetch() calls is a one-file
//  change per domain with zero component edits.
// ─────────────────────────────────────────────────────────────

export interface NewsArticle {
  slug: string;
  title: string;
  /** Short teaser shown in feeds/cards. */
  excerpt: string;
  /** Full article body (paragraphs joined by \n\n). */
  body: string;
  image?: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  likes: number;
  comments: number;
  shares: number;
}

export interface Review {
  slug: string;
  phone: string;
  brand: string;
  influencer: string;
  channelAvatar: string;
  videoId: string;
  thumbnail: string;
  views: string;
  date: string;
  duration: string;
  /** Editorial verdict/summary shown on the review detail page. */
  verdict?: string;
  pros?: string[];
  cons?: string[];
  rating?: number;
}

export interface Video {
  slug: string;
  title: string;
  description: string;
  videoId: string;
  thumbnail: string;
  category: string;
  views: string;
  date: string;
  duration: string;
}

export interface CommunityPost {
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
}
