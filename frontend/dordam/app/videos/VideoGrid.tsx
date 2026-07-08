"use client";

import { useState } from "react";

interface Video {
  id: string;
  title: string;
  description: string;
  videoId: string;
  thumbnail: string;
  category: string;
  views: string;
  date: string;
  duration: string;
}

const categoryColors: Record<string, string> = {
  Comparison: "bg-blue-500/20 text-blue-400",
  "Buyer's Guide": "bg-green-500/20 text-green-400",
  Review: "bg-purple-500/20 text-purple-400",
  Unboxing: "bg-yellow-500/20 text-yellow-400",
  "Price Update": "bg-orange-500/20 text-orange-400",
  Tutorial: "bg-cyan-500/20 text-cyan-400",
  Discussion: "bg-pink-500/20 text-pink-400",
};

export default function VideoGrid({ videos }: { videos: Video[] }) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Featured / Latest Video */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="relative aspect-video w-full bg-black">
          {playingId === videos[0].id ? (
            <iframe
              src={`https://www.youtube.com/embed/${videos[0].videoId}?autoplay=1`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={videos[0].title}
            />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={videos[0].thumbnail}
                alt={videos[0].title}
                className="h-full w-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button
                onClick={() => setPlayingId(videos[0].id)}
                className="absolute inset-0 flex items-center justify-center"
                aria-label="Play featured video"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-2xl transition-transform hover:scale-110">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </button>
              <span className="absolute bottom-4 right-4 rounded bg-black/80 px-2 py-1 text-xs font-bold text-white">
                {videos[0].duration}
              </span>
              <div className="absolute bottom-4 left-4 right-20">
                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${categoryColors[videos[0].category] || "bg-zinc-500/20 text-zinc-400"}`}>
                  {videos[0].category}
                </span>
                <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">{videos[0].title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-300">{videos[0].description}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rest of Videos Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.slice(1).map((video) => (
          <article
            key={video.id}
            className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:border-[var(--border-hover)] hover:shadow-lg hover:shadow-black/20"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video w-full bg-[var(--bg-secondary)]">
              {playingId === video.id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title}
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                  />
                  <button
                    onClick={() => setPlayingId(video.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/10"
                    aria-label={`Play ${video.title}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform group-hover:scale-110">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </button>
                  <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {video.duration}
                  </span>
                  <span className={`absolute top-2 left-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${categoryColors[video.category] || "bg-zinc-500/20 text-zinc-400"}`}>
                    {video.category}
                  </span>
                </>
              )}
            </div>

            {/* Info */}
            <div className="p-3.5">
              <h3 className="mb-1.5 line-clamp-2 text-sm font-bold leading-tight text-[var(--text-primary)]">
                {video.title}
              </h3>
              <p className="mb-2.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                {video.description}
              </p>
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span className="font-semibold">{video.views} views</span>
                </div>
                <span className="font-semibold">{video.date}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
