import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  /** Builds the href for a given page number (keeps other query params intact). */
  hrefFor: (page: number) => string;
}

/** Compact numeric pagination with prev/next and windowed page numbers. */
export default function Pagination({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;

  // Windowed page list: first, last, and neighbours of the current page.
  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  const window = 1;
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || (n >= page - window && n <= page + window)) {
      push(n);
    } else if (pages[pages.length - 1] !== "…") {
      push("…");
    }
  }

  const base =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors";

  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={`${base} border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]`}>
          ← Prev
        </Link>
      ) : (
        <span className={`${base} border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] opacity-60`}>← Prev</span>
      )}

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-[var(--text-muted)]">…</span>
        ) : p === page ? (
          <span key={p} className={`${base} bg-[var(--accent)] text-white`}>{p}</span>
        ) : (
          <Link key={p} href={hrefFor(p)} className={`${base} border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]`}>
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={`${base} border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]`}>
          Next →
        </Link>
      ) : (
        <span className={`${base} border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] opacity-60`}>Next →</span>
      )}
    </nav>
  );
}
