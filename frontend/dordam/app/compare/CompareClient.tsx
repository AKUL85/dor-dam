"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PhoneDetail, PhoneCard as PhoneCardT } from "@/lib/api";
import { quickSearch } from "@/lib/api";

interface Props {
  initialPhones: PhoneDetail[];
  initialSlugs: string[];
}

// Spec sections to compare
const COMPARE_SECTIONS = [
  "Network", "Launch", "Body", "Display", "Platform", "Memory",
  "Main Camera", "Selfie camera", "Sound", "Comms", "Features",
  "Battery", "Misc",
];

export default function CompareClient({ initialPhones, initialSlugs }: Props) {
  const router = useRouter();
  const [phones] = useState<PhoneDetail[]>(initialPhones);

  // Search state for adding phones
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

  // Collect all unique spec keys across phones for a section
  const getKeys = (section: string) => {
    const keys = new Set<string>();
    phones.forEach((p) => {
      if (p.specs[section]) {
        Object.keys(p.specs[section]).forEach((k) => keys.add(k));
      }
    });
    return Array.from(keys);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-white">Compare Phones</h1>
      <p className="mt-1 text-sm text-slate-400">
        Add up to 3 phones to compare their specifications side-by-side.
      </p>

      {/* Phone columns header */}
      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {phones.map((phone) => (
          <div
            key={phone.slug}
            className="relative flex w-56 shrink-0 flex-col items-center rounded-xl border border-white/[0.06] bg-[#1a2235] p-4"
          >
            <button
              onClick={() => removePhone(phone.slug)}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition hover:bg-red-500/30"
              aria-label="Remove phone"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            {phone.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={phone.imageUrl} alt={phone.modelName} className="h-32 w-auto object-contain" />
            ) : (
              <div className="flex h-32 w-20 items-center justify-center rounded-lg bg-slate-700/30 text-slate-500">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                </svg>
              </div>
            )}
            <p className="mt-3 text-center text-sm font-semibold text-white">{phone.modelName}</p>
            <p className="text-xs text-slate-500">{phone.brand}</p>
          </div>
        ))}

        {/* Add phone slot */}
        {phones.length < 3 && (
          <div className="relative w-56 shrink-0">
            <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-white/[0.08] p-4">
              <div className="flex h-32 w-20 items-center justify-center rounded-lg text-slate-600">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500">Add Phone</p>

              {/* Search input */}
              <div className="mt-3 w-full">
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onFocus={() => searchResults.length && setSearchOpen(true)}
                  placeholder="Search to add…"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#151d2e] px-3 py-2 text-xs text-slate-300 outline-none placeholder:text-slate-500 focus:border-blue-500/50 transition"
                />
              </div>
            </div>

            {/* Search dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-white/[0.1] bg-[#1a2235] shadow-2xl">
                {searchResults.map((r) => (
                  <li key={r.slug}>
                    <button
                      onClick={() => addPhone(r.slug)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-white/[0.06]"
                    >
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="h-8 w-8 shrink-0 rounded bg-slate-800/50 object-contain p-0.5" />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-800/50 text-slate-500">📱</span>
                      )}
                      <span className="min-w-0 truncate text-slate-300">{r.name}</span>
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
        <div className="mt-8 overflow-x-auto">
          <div className="min-w-[600px]">
            {COMPARE_SECTIONS.map((section) => {
              const keys = getKeys(section);
              if (keys.length === 0) return null;

              return (
                <div key={section} className="mb-1">
                  <div className="rounded-t-lg bg-blue-500/10 border-l-3 border-blue-500 px-4 py-2.5">
                    <h3 className="text-sm font-semibold text-blue-300">{section}</h3>
                  </div>
                  <div className="divide-y divide-white/[0.04] rounded-b-lg border border-t-0 border-white/[0.06] bg-[#1a2235] mb-3">
                    {keys.map((key) => (
                      <div key={key} className="flex hover:bg-white/[0.02] transition-colors">
                        <div className="w-36 shrink-0 px-4 py-2.5 text-xs font-medium text-slate-500">
                          {key}
                        </div>
                        {phones.map((p) => (
                          <div
                            key={p.slug}
                            className="flex-1 px-4 py-2.5 text-xs text-slate-300 border-l border-white/[0.04]"
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
      ) : phones.length === 1 ? (
        <div className="mt-12 text-center">
          <span className="text-4xl">⚖️</span>
          <p className="mt-4 text-lg font-medium text-slate-300">Add one more phone to compare</p>
          <p className="mt-1 text-sm text-slate-500">Use the search box above to add another phone.</p>
        </div>
      ) : (
        <div className="mt-12 text-center">
          <span className="text-5xl">⚖️</span>
          <p className="mt-4 text-lg font-medium text-slate-300">No phones selected</p>
          <p className="mt-1 text-sm text-slate-500">Use the search box above to add phones for comparison.</p>
        </div>
      )}
    </div>
  );
}
