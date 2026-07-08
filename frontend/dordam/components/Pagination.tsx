"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Base path, e.g. "/phones" */
  basePath: string;
}

export default function Pagination({ page, totalPages, basePath }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const buildHref = (p: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };

  // Build page numbers with ellipsis
  const pages: (number | "…")[] = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1.5 py-6" aria-label="Pagination">
      {/* Prev */}
      <button
        disabled={page <= 1}
        onClick={() => router.push(buildHref(page - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-sm text-slate-500">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => router.push(buildHref(p))}
            className={`flex h-9 min-w-[36px] items-center justify-center rounded-lg text-sm font-medium transition ${
              p === page
                ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
                : "border border-white/[0.08] text-slate-400 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        disabled={page >= totalPages}
        onClick={() => router.push(buildHref(page + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </nav>
  );
}
