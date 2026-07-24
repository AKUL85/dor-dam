"use client";

import { useState, useEffect, useCallback } from "react";
import type { Brand, PhoneCard as PhoneCardT } from "@/lib/api";
import { API_BASE } from "@/lib/api";
import PhoneCard from "@/components/common/PhoneCard";

interface Props {
  brands: Brand[];
}

type Filters = {
  brand: string;
  minYear: string;
  search: string;
  sort: string;
};

const SORTS = [
  { value: "popularity", label: "Most Popular" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name", label: "Name A–Z" },
];

const inputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]";

export default function FinderClient({ brands }: Props) {
  const [filters, setFilters] = useState<Filters>({
    brand: "",
    minYear: "",
    search: "",
    sort: "popularity",
  });
  const [results, setResults] = useState<PhoneCardT[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (filters.brand) params.set("brand", filters.brand);
      if (filters.minYear) params.set("minYear", filters.minYear);
      if (filters.search) params.set("search", filters.search);
      params.set("sort", filters.sort);
      params.set("pageSize", "60");

      const res = await fetch(`${API_BASE}/phones?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.items || []);
        setTotal(data.total || 0);
      }
    } catch {
      setResults([]);
      setTotal(0);
    }
    setLoading(false);
  }, [filters]);

  // Debounced auto-search on filter change.
  useEffect(() => {
    const timer = setTimeout(doSearch, 300);
    return () => clearTimeout(timer);
  }, [doSearch]);

  const update = (key: keyof Filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearAll = () =>
    setFilters({ brand: "", minYear: "", search: "", sort: "popularity" });

  // Year options 2015 → current. Computed once from a stable base to avoid
  // reading the clock during render on the server.
  const years: string[] = [];
  for (let y = 2026; y >= 2015; y--) years.push(String(y));

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[var(--text)]">Phone Finder</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Use the filters below to narrow down your perfect phone.
        </p>
      </div>

      {/* Filter panel */}
      <div className="card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Search</label>
            <input
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
              placeholder="Phone name, model…"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Brand</label>
            <select value={filters.brand} onChange={(e) => update("brand", e.target.value)} className={inputClass}>
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.name}>
                  {b.name} ({b.phoneCount})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Released After</label>
            <select value={filters.minYear} onChange={(e) => update("minYear", e.target.value)} className={inputClass}>
              <option value="">Any Year</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}+</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Sort By</label>
            <select value={filters.sort} onChange={(e) => update("sort", e.target.value)} className={inputClass}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            {searched && !loading && `${total} phones found`}
          </p>
          <button
            onClick={clearAll}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-72" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((phone) => (
              <PhoneCard key={phone.slug} phone={phone} />
            ))}
          </div>
        ) : searched ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl">🔍</span>
            <p className="mt-3 text-lg font-semibold text-[var(--text)]">No phones match your filters</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Try adjusting your criteria.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
