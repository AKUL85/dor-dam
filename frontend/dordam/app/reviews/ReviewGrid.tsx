"use client";

import { useState } from "react";

interface Review {
  id: string;
  phone: string;
  brand: string;
  influencer: string;
  channelAvatar: string;
  videoId: string;
  thumbnail: string;
  views: string;
  date: string;
  duration: string;
}

export default function ReviewGrid({ reviews }: { reviews: Review[] }) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:border-[var(--border-hover)] hover:shadow-lg hover:shadow-black/20"
        >
          {/* Video / Thumbnail */}
          <div className="relative aspect-video w-full bg-[var(--bg-secondary)]">
            {playingId === review.id ? (
              <iframe
                src={`https://www.youtube.com/embed/${review.videoId}?autoplay=1`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${review.phone} review by ${review.influencer}`}
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={review.thumbnail}
                  alt={review.phone}
                  className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                />
                {/* Play button overlay */}
                <button
                  onClick={() => setPlayingId(review.id)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/20"
                  aria-label={`Play ${review.phone} review`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform group-hover:scale-110">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </button>
                {/* Duration badge */}
                <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {review.duration}
                </span>
              </>
            )}
          </div>

          {/* Content */}
          <div className="p-3.5">
            <h3 className="mb-1.5 text-sm font-bold leading-tight text-[var(--text-primary)] line-clamp-2">
              {review.phone} Review
            </h3>

            {/* Influencer row */}
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--accent)]">
                {review.channelAvatar}
              </div>
              <div className="min-w-0">
                <span className="block truncate text-xs font-semibold text-[var(--text-secondary)]">
                  {review.influencer}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {review.views} views • {review.date}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 border-t border-[var(--border)] pt-2.5">
              <button className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                Like
              </button>
              <button className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Comment
              </button>
              <button className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${review.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-red-500"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
                YouTube
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
