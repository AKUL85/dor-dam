import Link from "next/link";
import type { Brand } from "@/lib/api";

// SVG icon per brand (fallback to first letter)
function BrandIcon({ name }: { name: string }) {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 text-lg font-bold text-blue-300 transition-colors group-hover:from-blue-600/30 group-hover:to-indigo-600/30">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

interface BrandGridProps {
  brands: Brand[];
  /** Max brands to show before a "View all" link. 0 = show all. */
  limit?: number;
}

export default function BrandGrid({ brands, limit = 0 }: BrandGridProps) {
  const visible = limit > 0 ? brands.slice(0, limit) : brands;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visible.map((b) => (
          <Link
            key={b.slug}
            href={`/phones?brand=${encodeURIComponent(b.name)}`}
            className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#1a2235] px-4 py-3 transition-all duration-200 hover:border-blue-500/30 hover:bg-[#1f2a42] hover:shadow-md hover:shadow-blue-500/[0.05]"
          >
            <BrandIcon name={b.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                {b.name}
              </p>
              <p className="text-xs text-slate-500">
                {b.phoneCount} {b.phoneCount === 1 ? "phone" : "phones"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {limit > 0 && brands.length > limit && (
        <div className="mt-4 text-center">
          <Link
            href="/brands"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            View all {brands.length} brands
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
