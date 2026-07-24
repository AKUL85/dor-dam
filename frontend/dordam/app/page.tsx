import Link from "next/link";
import { fetchPhones } from "@/lib/api";
import { getNews, getReviews, getVideos } from "@/lib/mock";
import PhoneCard from "@/components/common/PhoneCard";
import NewsCard from "@/components/common/NewsCard";
import VideoCard from "@/components/common/VideoCard";

export const metadata = {
  title: "DorDam — Phone Specs, Reviews & Prices in Bangladesh",
  description:
    "Browse phone specifications, compare devices, read reviews and track prices across stores in Bangladesh.",
};

export default async function Home() {
  // Real catalog data (falls back to empty on API outage).
  let popular: Awaited<ReturnType<typeof fetchPhones>>["items"] = [];
  let latest: typeof popular = [];
  try {
    const [pop, lat] = await Promise.all([
      fetchPhones({ sort: "popularity", pageSize: 10 }),
      fetchPhones({ sort: "newest", pageSize: 5 }),
    ]);
    popular = pop.items;
    latest = lat.items;
  } catch {
    // API unavailable — sections render empty.
  }

  // Editorial (mock) data.
  const [news, reviews, videos] = await Promise.all([
    getNews(),
    getReviews(),
    getVideos(),
  ]);

  const featured = news[0];
  const secondaryNews = news.slice(1, 5);

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* ── Featured news hero ── */}
      {featured && (
        <section>
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            {/* Lead story */}
            <Link
              href={`/news/${featured.slug}`}
              className="group relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[var(--radius-lg)] border border-line bg-header"
            >
              {featured.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <div className="relative z-10 p-5">
                <span className="mb-2 inline-block rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  {featured.category}
                </span>
                <h2 className="text-xl font-bold leading-tight text-white group-hover:text-[var(--accent-soft)] sm:text-2xl">
                  {featured.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-white/75">{featured.excerpt}</p>
                <p className="mt-2 text-xs text-white/55">
                  {featured.author} · {featured.date}
                </p>
              </div>
            </Link>

            {/* Secondary headlines */}
            <div className="flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              {secondaryNews.map((a) => (
                <Link
                  key={a.slug}
                  href={`/news/${a.slug}`}
                  className="group flex gap-3 p-3 transition-colors hover:bg-surface-2"
                >
                  {a.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.image}
                      alt={a.title}
                      className="h-16 w-20 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-20 shrink-0 items-center justify-center rounded-md bg-surface-3 text-[10px] font-bold uppercase text-ink-muted">
                      {a.category}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-semibold text-ink group-hover:text-[var(--accent)]">
                      {a.title}
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">{a.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Latest devices ── */}
      {latest.length > 0 && (
        <HomeSection title="Latest Devices" href="/phones?sort=newest">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {latest.map((p) => (
              <PhoneCard key={p.slug} phone={p} />
            ))}
          </div>
        </HomeSection>
      )}

      {/* ── Popular devices ── */}
      {popular.length > 0 && (
        <HomeSection title="Popular This Week" href="/phones?sort=popularity">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {popular.slice(0, 10).map((p) => (
              <PhoneCard key={p.slug} phone={p} />
            ))}
          </div>
        </HomeSection>
      )}

      {/* ── Latest reviews ── */}
      <HomeSection title="Latest Reviews" href="/reviews">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 3).map((r) => (
            <Link
              key={r.slug}
              href={`/reviews/${r.slug}`}
              className="card group overflow-hidden transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-video overflow-hidden bg-surface-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.thumbnail}
                  alt={r.phone}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {r.duration}
                </span>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-ink group-hover:text-[var(--accent)]">
                  {r.phone} Review
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  {r.influencer} · {r.views} views
                </p>
              </div>
            </Link>
          ))}
        </div>
      </HomeSection>

      {/* ── Videos strip ── */}
      <HomeSection title="Videos" href="/videos">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {videos.slice(0, 4).map((v) => (
            <VideoCard key={v.slug} video={v} />
          ))}
        </div>
      </HomeSection>

      {/* ── News grid ── */}
      <HomeSection title="More News" href="/news">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {news.slice(5, 11).map((a) => (
            <NewsCard key={a.slug} article={a} />
          ))}
        </div>
      </HomeSection>
    </div>
  );
}

function HomeSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">{title}</h2>
        <Link
          href={href}
          className="text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          View all →
        </Link>
      </div>
      {children}
    </section>
  );
}
