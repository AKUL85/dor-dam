import Link from "next/link";
import type { Video } from "@/lib/mock";

/** Video thumbnail card with play overlay and duration badge. */
export default function VideoCard({ video }: { video: Video }) {
  return (
    <Link
      href={`/videos/${video.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--surface-3)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnail}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[var(--accent)] shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
        {/* Duration */}
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {video.duration}
        </span>
        {/* Category */}
        <span className="absolute left-2 top-2 rounded bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {video.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-bold leading-snug text-[var(--text)] line-clamp-2 group-hover:text-[var(--accent)]">
          {video.title}
        </h3>
        <div className="mt-auto flex items-center gap-2 pt-2 text-[11px] text-[var(--text-muted)]">
          <span>{video.views} views</span>
          <span>·</span>
          <span>{video.date}</span>
        </div>
      </div>
    </Link>
  );
}
