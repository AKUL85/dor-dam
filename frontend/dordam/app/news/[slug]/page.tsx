import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNews, getNewsArticle, getRelatedNews } from "@/lib/mock";
import ArticleActions from "./ArticleActions";

interface Props {
  params: Promise<{ slug: string }>;
}

// Pre-render every article at build time.
export async function generateStaticParams() {
  const articles = await getNews();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  if (!article) return { title: "Article not found — DorDam" };
  return {
    title: `${article.title} — DorDam`,
    description: article.excerpt,
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  if (!article) notFound();

  const related = await getRelatedNews(slug, 4);

  return (
    <article className="animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Link href="/" className="hover:text-[var(--accent)]">Home</Link>
        <span>/</span>
        <Link href="/news" className="hover:text-[var(--accent)]">News</Link>
        <span>/</span>
        <span className="truncate text-[var(--text-secondary)]">{article.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            {article.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.image}
                alt={article.title}
                className="h-64 w-full object-cover sm:h-80"
              />
            )}
            <div className="p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 font-bold uppercase tracking-wide text-[var(--accent)]">
                  {article.category}
                </span>
                <span className="text-[var(--text-muted)]">{article.author}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--text-muted)]">{article.date}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--text-muted)]">{article.readTime} read</span>
              </div>

              <h1 className="text-2xl font-extrabold leading-tight text-[var(--text)] sm:text-3xl">
                {article.title}
              </h1>

              <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
                {article.body.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              {/* Functional like / comment / share */}
              <ArticleActions
                slug={article.slug}
                initialLikes={article.likes}
                initialComments={article.comments}
                shares={article.shares}
              />
            </div>
          </div>
        </div>

        {/* Related sidebar */}
        <aside className="space-y-3">
          <h2 className="section-title">Related</h2>
          {related.map((r) => (
            <Link
              key={r.slug}
              href={`/news/${r.slug}`}
              className="group flex gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
            >
              {r.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image}
                  alt={r.title}
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
              )}
              <span className="text-[13px] font-semibold leading-snug text-[var(--text)] line-clamp-3 group-hover:text-[var(--accent)]">
                {r.title}
              </span>
            </Link>
          ))}
        </aside>
      </div>
    </article>
  );
}
