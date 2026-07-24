import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReviews, getReview } from "@/lib/mock";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const reviews = await getReviews();
  return reviews.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReview(slug);
  if (!review) return { title: "Review not found — DorDam" };
  return {
    title: `${review.phone} Review — DorDam`,
    description: review.verdict ?? `Video review of the ${review.phone}.`,
  };
}

export default async function ReviewDetailPage({ params }: Props) {
  const { slug } = await params;
  const review = await getReview(slug);
  if (!review) notFound();

  const all = await getReviews();
  const more = all.filter((r) => r.slug !== slug).slice(0, 4);

  return (
    <article className="animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Link href="/" className="hover:text-[var(--accent)]">Home</Link>
        <span>/</span>
        <Link href="/reviews" className="hover:text-[var(--accent)]">Reviews</Link>
        <span>/</span>
        <span className="truncate text-[var(--text-secondary)]">{review.phone}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          {/* Video player */}
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-black shadow-[var(--shadow-sm)]">
            <div className="relative aspect-video">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${review.videoId}`}
                title={`${review.phone} review`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Header */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 font-bold uppercase tracking-wide text-[var(--accent)]">
                {review.brand}
              </span>
              <span className="text-[var(--text-muted)]">{review.influencer}</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[var(--text-muted)]">{review.views} views</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[var(--text-muted)]">{review.date}</span>
            </div>

            <div className="mt-3 flex items-start justify-between gap-4">
              <h1 className="text-2xl font-extrabold leading-tight text-[var(--text)]">
                {review.phone} Review
              </h1>
              {typeof review.rating === "number" && (
                <div className="flex shrink-0 flex-col items-center rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 text-white">
                  <span className="text-2xl font-extrabold leading-none">{review.rating.toFixed(1)}</span>
                  <span className="text-[10px] uppercase tracking-wide opacity-80">/ 10</span>
                </div>
              )}
            </div>

            {review.verdict && (
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
                {review.verdict}
              </p>
            )}

            {/* Pros / cons */}
            {(review.pros?.length || review.cons?.length) && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {review.pros?.length ? (
                  <div className="rounded-[var(--radius-md)] border border-[#c9ebd6] bg-[#f0faf4] p-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[var(--success)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                      Pros
                    </h3>
                    <ul className="space-y-1.5 text-[13px] text-[var(--text-secondary)]">
                      {review.pros.map((p, i) => (
                        <li key={i} className="flex gap-2"><span className="text-[var(--success)]">+</span>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {review.cons?.length ? (
                  <div className="rounded-[var(--radius-md)] border border-[#f3d3d3] bg-[#fdf1f1] p-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[var(--danger)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      Cons
                    </h3>
                    <ul className="space-y-1.5 text-[13px] text-[var(--text-secondary)]">
                      {review.cons.map((c, i) => (
                        <li key={i} className="flex gap-2"><span className="text-[var(--danger)]">−</span>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* More reviews */}
        <aside className="space-y-3">
          <h2 className="section-title">More Reviews</h2>
          {more.map((r) => (
            <Link
              key={r.slug}
              href={`/reviews/${r.slug}`}
              className="group flex gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.thumbnail} alt={r.phone} className="h-full w-full object-cover" />
              </div>
              <span className="text-[13px] font-semibold leading-snug text-[var(--text)] line-clamp-2 group-hover:text-[var(--accent)]">
                {r.phone}
              </span>
            </Link>
          ))}
        </aside>
      </div>
    </article>
  );
}
