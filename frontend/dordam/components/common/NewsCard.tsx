import Link from "next/link";
import type { NewsArticle } from "@/lib/mock";

const CATEGORY_STYLES: Record<string, string> = {
  Launch: "bg-[#e7f6ee] text-[var(--success)]",
  "Price Drop": "bg-[#fef3e2] text-[var(--warning)]",
  Rumor: "bg-[#f3e8ff] text-[#7c3aed]",
  Guide: "bg-[var(--accent-soft)] text-[var(--accent)]",
  Event: "bg-[#ffedd5] text-[#c2410c]",
};

function categoryClass(category: string) {
  return CATEGORY_STYLES[category] ?? "bg-[var(--surface-3)] text-[var(--text-secondary)]";
}

interface Props {
  article: NewsArticle;
  /** "lead" renders a large featured layout; default is the compact feed card. */
  variant?: "default" | "lead";
}

/** Article card for the news feed. Compact by default, or a large "lead" hero. */
export default function NewsCard({ article, variant = "default" }: Props) {
  if (variant === "lead") {
    return (
      <Link
        href={`/news/${article.slug}`}
        className="group grid overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] sm:grid-cols-2"
      >
        {article.image && (
          <div className="relative h-52 overflow-hidden bg-[var(--surface-3)] sm:h-full sm:min-h-[240px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        <div className="flex flex-col justify-center gap-3 p-6">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${categoryClass(article.category)}`}>
              {article.category}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">{article.date}</span>
          </div>
          <h2 className="text-xl font-extrabold leading-tight text-[var(--text)] group-hover:text-[var(--accent)]">
            {article.title}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-3">
            {article.excerpt}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <span>{article.author}</span>
            <span>·</span>
            <span>{article.readTime} read</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/news/${article.slug}`}
      className="group flex gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
    >
      {article.image && (
        <div className="relative hidden h-24 w-36 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)] sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <div className="mb-1.5 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${categoryClass(article.category)}`}>
            {article.category}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">{article.date}</span>
        </div>
        <h3 className="text-[15px] font-bold leading-snug text-[var(--text)] line-clamp-2 group-hover:text-[var(--accent)]">
          {article.title}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)] line-clamp-2">
          {article.excerpt}
        </p>
        <div className="mt-auto flex items-center gap-3 pt-2 text-[11px] text-[var(--text-muted)]">
          <span>{article.author}</span>
          <span>·</span>
          <span>{article.readTime} read</span>
        </div>
      </div>
    </Link>
  );
}
