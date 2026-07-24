"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { quickSearch, type PhoneCard } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
//  Global search box with type-ahead. Talks to the real catalog
//  API via quickSearch(); Enter without a selection navigates to
//  the full /phones search results.
// ─────────────────────────────────────────────────────────────
export default function SearchBox({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PhoneCard[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      const r = await quickSearch(q, 8);
      setResults(r);
      setOpen(true);
      setActive(-1);
    }, 180);
    return () => clearTimeout(id);
  }, [q]);

  const go = (slug: string) => {
    setOpen(false);
    setQ("");
    router.push(`/phones/${slug}`);
  };

  const submit = () => {
    if (active >= 0 && results[active]) {
      go(results[active].slug);
    } else if (q.trim()) {
      setOpen(false);
      router.push(`/phones?search=${encodeURIComponent(q.trim())}`);
    }
  };

  const h = compact ? "h-9" : "h-10";

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            else if (e.key === "ArrowDown")
              setActive((a) => Math.min(a + 1, results.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, -1));
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search phones, brands…"
          className={`w-full rounded-l-lg border border-transparent bg-white/95 px-3.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] transition ${h}`}
        />
        <button
          onClick={submit}
          aria-label="Search"
          className={`flex shrink-0 items-center justify-center rounded-r-lg bg-[var(--accent)] px-4 text-white transition hover:bg-[var(--accent-hover)] ${h}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-[60] mt-1.5 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-fade-in">
          {results.map((r, i) => (
            <li key={r.slug}>
              <button
                onClick={() => go(r.slug)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${
                  i === active ? "bg-[var(--surface-3)]" : ""
                }`}
              >
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" className="h-10 w-10 shrink-0 rounded-md bg-[var(--surface-3)] object-contain p-1" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--surface-3)] text-[var(--text-muted)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    </svg>
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-[var(--text)]">{r.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {r.brand}
                    {r.releaseYear ? ` · ${r.releaseYear}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
