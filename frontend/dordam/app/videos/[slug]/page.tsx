import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideos, getVideo } from "@/lib/mock";
import VideoPlayer from "./VideoPlayer";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const videos = await getVideos();
  return videos.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideo(slug);
  if (!video) return { title: "Video not found — DorDam" };
  return { title: `${video.title} — DorDam`, description: video.description };
}

export default async function VideoDetailPage({ params }: Props) {
  const { slug } = await params;
  const video = await getVideo(slug);
  if (!video) notFound();

  const all = await getVideos();
  const related = all.filter((v) => v.slug !== slug).slice(0, 6);

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Link href="/" className="hover:text-[var(--accent)]">Home</Link>
        <span>/</span>
        <Link href="/videos" className="hover:text-[var(--accent)]">Videos</Link>
        <span>/</span>
        <span className="truncate text-[var(--text-secondary)]">{video.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <VideoPlayer videoId={video.videoId} thumbnail={video.thumbnail} title={video.title} />

          <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
            <span className="w-fit rounded bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {video.category}
            </span>
            <h1 className="mt-3 text-xl font-extrabold leading-tight text-[var(--text)]">
              {video.title}
            </h1>
            <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span>{video.views} views</span>
              <span>·</span>
              <span>{video.date}</span>
              <span>·</span>
              <span>{video.duration}</span>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
              {video.description}
            </p>
          </div>
        </div>

        {/* Up next */}
        <aside className="space-y-3">
          <h2 className="section-title">Up Next</h2>
          {related.map((v) => (
            <Link
              key={v.slug}
              href={`/videos/${v.slug}`}
              className="group flex gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-semibold text-white">
                  {v.duration}
                </span>
              </div>
              <span className="min-w-0">
                <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent)]">
                  {v.title}
                </span>
                <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                  {v.views} views
                </span>
              </span>
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
