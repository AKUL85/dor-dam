import type { Metadata } from "next";
import { getReviews } from "@/lib/mock";
import VideoCard from "@/components/common/VideoCard";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reviews — DorDam",
  description:
    "In-depth phone reviews and video verdicts from trusted reviewers.",
};

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">Reviews</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Video reviews and verdicts for the latest phones.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <Link
            key={review.slug}
            href={`/reviews/${review.slug}`}
            className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
          >
            <div className="relative aspect-video overflow-hidden bg-[var(--surface-3)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={review.thumbnail}
                alt={review.phone}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              {/* Play badge */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {review.duration}
              </span>
              {typeof review.rating === "number" && (
                <span className="absolute left-2 top-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold text-white">
                  {review.rating.toFixed(1)}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                {review.brand}
              </span>
              <h3 className="text-[15px] font-bold leading-snug text-[var(--text)] group-hover:text-[var(--accent)]">
                {review.phone}
              </h3>
              <div className="mt-auto flex items-center gap-2 pt-2 text-[11px] text-[var(--text-muted)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-3)] text-[9px] font-bold text-[var(--text-secondary)]">
                  {review.channelAvatar}
                </span>
                <span>{review.influencer}</span>
                <span>·</span>
                <span>{review.views} views</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
