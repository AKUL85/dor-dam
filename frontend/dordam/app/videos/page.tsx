import type { Metadata } from "next";
import { getVideos } from "@/lib/mock";
import VideoCard from "@/components/common/VideoCard";

export const metadata: Metadata = {
  title: "Videos — DorDam",
  description:
    "Watch DorDam videos: phone comparisons, buyer's guides, unboxings and price updates.",
};

export default async function VideosPage() {
  const videos = await getVideos();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">Videos</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Comparisons, buyer&apos;s guides, unboxings &amp; price updates.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <VideoCard key={video.slug} video={video} />
        ))}
      </div>
    </div>
  );
}
