"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PhoneDetail, PhoneCard as PhoneCardT } from "@/lib/api";
import { quickSearch } from "@/lib/api";

interface Props {
  initialPhones: PhoneDetail[];
  initialSlugs: string[];
}

// Spec sections to compare, in display order.
const COMPARE_SECTIONS = [
  "Network", "Launch", "Body", "Display", "Platform", "Memory",
  "Main Camera", "Selfie camera", "Sound", "Comms", "Features",
  "Battery", "Misc",
];

export default function CompareClient({ initialPhones, initialSlugs }: Props) {
  const router = useRouter();
  const phones = initialPhones;

  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<PhoneCardT[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!searchQ.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const r = await quickSearch(searchQ, 6);
      setSearchResults(r.filter((p) => !initialSlugs.includes(p.slug)));
      setSearchOpen(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQ, initialSlugs]);

  const addPhone = useCallback(
    (slug: string) => {
      const newSlugs = [...initialSlugs, slug].slice(0, 3);
      router.push(`/compare?slugs=${newSlugs.join(",")}`);
      setSearchQ("");
      setSearchOpen(false);
    },
    [initialSlugs, router]
  );

  const removePhone = useCallback(
    (slug: string) => {
      const newSlugs = initialSlugs.filter((s) => s !== slug);
      router.push(newSlugs.length > 0 ? `/compare?slugs=${newSlugs.join(",")}` : "/compare");
    },
    [initialSlugs, router]
  );

  // Union of spec keys across all phones for a section.
  const getKeys = (section: string) => {
    const keys = new Set<string>();
    phones.forEach((p) => {
      if (p.specs[section]) Object.keys(p.specs[section]).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  };

  // Highlight differing values across phones for a given row.
  const valuesDiffer = (section: string, key: string) => {
    const vals = phones.map((p) => p.specs[section]?.[key] ?? "");
    return new Set(vals).size > 1;
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[var(--text)]">Compare Phones</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Add up to 3 phones to compare their specifications side by side.
        </p>
      </div>

      {/* Phone columns */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {phones.map((phone) => (
          <div
            key={phone.slug}
            className="relative flex w-52 shrink-0 flex-col items-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <button
              onClick={() => removePhone(phone.slug)}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#fdecec] text-[var(--danger)] transition hover:bg-[#fbdada]"
              aria-label={`Remove ${phone.modelName}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            {phone.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={phone.imageUrl} alt={phone.modelName} className="h-32 w-auto object-contain" />
            ) : (
              <div className="flex h-32 w-20 items-center justify-center rounded-lg bg-[var(--surface-3)] text-[var(--text-muted)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                </svg>
              </div>
            )}
            <p className="mt-3 text-center text-sm font-bold text-[var(--text)]">{phone.modelName}</p>
            <p className="text-xs text-[var(--text-muted)]">{phone.brand}</p>
          </div>
        ))}

        {/* Add slot */}
        {phones.length < 3 && (
          <div className="relative w-52 shrink-0">
            <div className="flex flex-col items-center rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border-strong)] p-4">
              <div className="flex h-32 w-20 items-center justify-center text-[var(--text-muted)]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">Add Phone</p>
              <div className="mt-3 w-full">
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onFocus={() => searchResults.length && setSearchOpen(true)}
                  placeholder="Search to add…"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] transition"
                />
              </div>
            </div>

            {searchOpen && searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
                {searchResults.map((r) => (
                  <li key={r.slug}>
                    <button
                      onClick={() => addPhone(r.slug)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--surface-2)]"
                    >
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="h-8 w-8 shrink-0 rounded bg-[var(--surface-3)] object-contain p-0.5" />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--surface-3)] text-[var(--text-muted)]">📱</span>
                      )}
                      <span className="min-w-0 truncate text-[var(--text)]">{r.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Comparison table */}
      {phones.length >= 2 ? (
        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[600px]">
            {COMPARE_SECTIONS.map((section) => {
              const keys = getKeys(section);
              if (keys.length === 0) return null;
              return (
                <div key={section} className="mb-3">
                  <div className="spec-section-header rounded-t-[var(--radius-md)]">{section}</div>
                  <div className="divide-y divide-[var(--border)] rounded-b-[var(--radius-md)] border border-t-0 border-[var(--border)] bg-[var(--surface)]">
                    {keys.map((key) => (
                      <div key={key} className="flex transition-colors hover:bg-[var(--surface-2)]">
                        <div className="w-36 shrink-0 px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">
                          {key}
                        </div>
                        {phones.map((p) => (
                          <div
                            key={p.slug}
                            className={`flex-1 border-l border-[var(--border)] px-4 py-2.5 text-xs ${
                              valuesDiffer(section, key)
                                ? "font-medium text-[var(--text)]"
                                : "text-[var(--text-secondary)]"
                            }`}
                          >
                            {p.specs[section]?.[key] || "—"}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-12 text-center shadow-[var(--shadow-sm)]">
          <span className="text-4xl">⚖️</span>
          <p className="mt-4 text-lg font-semibold text-[var(--text)]">
            {phones.length === 1 ? "Add one more phone to compare" : "No phones selected"}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Use the search box above to add phones for comparison.
          </p>
        </div>
      )}
    </div>
  );
}
