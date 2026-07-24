"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const KEY = "dordam:compare";

/** Reads the compare slug list from localStorage. */
function readList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * "Add to Compare" — real local logic. Persists the selection in
 * localStorage (max 3), then lets the user jump to the compare view.
 * No backend needed; the compare page fetches specs by slug.
 */
export default function CompareButton({ slug }: { slug: string; name: string }) {
  const router = useRouter();
  const [inList, setInList] = useState(false);

  useEffect(() => {
    setInList(readList().includes(slug));
  }, [slug]);

  const toggle = () => {
    const list = readList();
    let next: string[];
    if (list.includes(slug)) {
      next = list.filter((s) => s !== slug);
    } else {
      next = [...list, slug].slice(0, 3);
    }
    window.localStorage.setItem(KEY, JSON.stringify(next));
    setInList(next.includes(slug));
  };

  const goCompare = () => {
    const list = readList();
    const slugs = list.includes(slug) ? list : [...list, slug].slice(0, 3);
    window.localStorage.setItem(KEY, JSON.stringify(slugs));
    router.push(`/compare?slugs=${slugs.join(",")}`);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-bold transition-colors ${
          inList
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          {inList ? <path d="M20 6 9 17l-5-5" /> : <path d="M12 5v14M5 12h14" />}
        </svg>
        {inList ? "Added" : "Compare"}
      </button>
      <button
        onClick={goCompare}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
      >
        Compare now →
      </button>
    </div>
  );
}
