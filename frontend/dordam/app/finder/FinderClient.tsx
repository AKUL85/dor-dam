"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Brand, PhoneCard as PhoneCardT } from "@/lib/api";
import { API_BASE } from "@/lib/api";
import PhoneCard from "@/components/PhoneCard";

interface Props {
  brands: Brand[];
}

type Filters = {
  brand: string;
  minYear: string;
  search: string;
  sort: string;
};

export default function FinderClient({ brands }: Props) {
  const router = useRouter();
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

  // Auto-search on filter change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [doSearch]);

  const update = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAll = () => {
    setFilters({ brand: "", minYear: "", search: "", sort: "popularity" });
  };

  const goToPhone = (slug: string) => {
    router.push(`/phones/${slug}`);
  };

  const years: string[] = [];
  const now = new Date().getFullYear();
  for (let y = now; y >= 2015; y--) years.push(String(y));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-white">Phone Finder</h1>
      <p className="mt-1 text-sm text-slate-400">
        Use filters to narrow down your perfect phone.
      </p>

      {/* Filter panel */}
      <div className="mt-8 rounded-xl border border-white/[0.06] bg-[#1a2235] p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Search</label>
            <input
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
              placeholder="Phone name, model…"
              className="w-full rounded-lg border border-white/[0.1] bg-[#151d2e] px-3.5 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500/50 transition"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Brand</label>
            <select
              value={filters.brand}
              onChange={(e) => update("brand", e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#151d2e] px-3.5 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500/50 transition"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.name}>
                  {b.name} ({b.phoneCount})
                </option>
              ))}
            </select>
          </div>

          {/* Min Year */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Released After</label>
            <select
              value={filters.minYear}
              onChange={(e) => update("minYear", e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#151d2e] px-3.5 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500/50 transition"
            >
              <option value="">Any Year</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}+</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Sort By</label>
            <select
              value={filters.sort}
              onChange={(e) => update("sort", e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#151d2e] px-3.5 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500/50 transition"
            >
              <option value="popularity">Most Popular</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {searched && !loading && `${total} phones found`}
          </p>
          <button
            onClick={clearAll}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-300"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton h-72 rounded-xl" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((phone) => (
              <PhoneCard key={phone.slug} phone={phone} />
            ))}
          </div>
        ) : searched ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl">🔍</span>
            <p className="mt-4 text-lg font-medium text-slate-300">No phones match your filters</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your criteria.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
