"use client";

import { useState } from "react";

interface NewsArticle {
  id: string;
  title: string;
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

const categoryColors: Record<string, string> = {
  Launch: "bg-green-500/20 text-green-400",
  "Price Drop": "bg-yellow-500/20 text-yellow-400",
  Rumor: "bg-purple-500/20 text-purple-400",
  Guide: "bg-blue-500/20 text-blue-400",
  Event: "bg-orange-500/20 text-orange-400",
};

export default function NewsFeed({ articles }: { articles: NewsArticle[] }) {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(
    Object.fromEntries(articles.map((a) => [a.id, a.likes]))
  );

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setLikeCounts((c) => ({ ...c, [id]: c[id] - 1 }));
      } else {
        next.add(id);
        setLikeCounts((c) => ({ ...c, [id]: c[id] + 1 }));
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <article
          key={article.id}
          className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] transition-colors hover:border-[var(--border-hover)]"
        >
          <div className="flex flex-col sm:flex-row">
            {/* Image */}
            {article.image && (
              <div className="relative w-full shrink-0 sm:w-[280px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.image}
                  alt={article.title}
                  className="h-[180px] w-full object-cover sm:h-full"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
              {/* Category + Meta */}
              <div className="mb-2 flex items-center gap-3">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    categoryColors[article.category] || "bg-zinc-500/20 text-zinc-400"
                  }`}
                >
                  {article.category}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {article.date} • {article.readTime} read
                </span>
              </div>

              {/* Title */}
              <h2 className="mb-2 text-lg font-bold leading-snug text-[var(--text-primary)]">
                {article.title}
              </h2>

              {/* Body */}
              <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {article.body}
              </p>

              {/* Author + Actions */}
              <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3">
                {/* Author */}
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                    DD
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-muted)]">{article.author}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => toggleLike(article.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                      likedIds.has(article.id)
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:text-[var(--accent)]"
                    }`}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill={likedIds.has(article.id) ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                    <span>{likeCounts[article.id]}</span>
                  </button>

                  <button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{article.comments}</span>
                  </button>

                  <button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>{article.shares}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
