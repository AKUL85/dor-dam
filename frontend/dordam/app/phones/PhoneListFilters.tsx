"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Brand } from "@/lib/api";

interface Props {
  brands: Brand[];
  currentBrand?: string;
  currentYear?: string;
  currentSort: string;
  currentSearch?: string;
}

const SORT_OPTIONS = [
  { value: "popularity", label: "Most Popular" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name", label: "Name A-Z" },
];

// Generate year options from 2015 to current year
function yearOptions(): string[] {
  const now = new Date().getFullYear();
  const years: string[] = [];
  for (let y = now; y >= 2015; y--) years.push(String(y));
  return years;
}

export default function PhoneListFilters({
  brands,
  currentBrand,
  currentYear,
  currentSort,
  currentSearch,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const apply = (key: string, value: string | undefined) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) {
      sp.set(key, value);
    } else {
      sp.delete(key);
    }
    // Reset to page 1 on filter change
    sp.delete("page");
    router.push(`/phones?${sp.toString()}`);
  };

  const clearAll = () => {
    router.push("/phones");
  };

  const hasFilters = currentBrand || currentYear || currentSearch;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Brand */}
      <select
        value={currentBrand || ""}
        onChange={(e) => apply("brand", e.target.value || undefined)}
        className="h-9 rounded-lg border border-white/[0.1] bg-[#151d2e] px-3 text-sm text-slate-300 outline-none focus:border-blue-500/50 transition"
      >
        <option value="">All Brands</option>
        {brands.map((b) => (
          <option key={b.slug} value={b.name}>
            {b.name} ({b.phoneCount})
          </option>
        ))}
      </select>

      {/* Year */}
      <select
        value={currentYear || ""}
        onChange={(e) => apply("year", e.target.value || undefined)}
        className="h-9 rounded-lg border border-white/[0.1] bg-[#151d2e] px-3 text-sm text-slate-300 outline-none focus:border-blue-500/50 transition"
      >
        <option value="">All Years</option>
        {yearOptions().map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={currentSort}
        onChange={(e) => apply("sort", e.target.value)}
        className="h-9 rounded-lg border border-white/[0.1] bg-[#151d2e] px-3 text-sm text-slate-300 outline-none focus:border-blue-500/50 transition"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
          Clear Filters
        </button>
      )}
    </div>
  );
}
