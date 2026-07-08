import Link from "next/link";
import { type Brand } from "@/lib/api";

export default function BrandSidebar({ brands }: { brands: Brand[] }) {
  // GSMArena shows a top list of popular brands, then an ALL BRANDS link.
  const topBrands = brands.slice(0, 36);

  return (
    <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
          Phone Finder
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 p-3">
        {topBrands.map((b) => (
          <Link
            key={b.slug}
            href={`/phones?brand=${b.slug}`}
            className="text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
          >
            {b.name}
          </Link>
        ))}
      </div>
      
      <div className="flex border-t border-[var(--border)]">
        <Link
          href="/brands"
          className="flex w-1/2 items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          All Brands
        </Link>
        <Link
          href="/finder"
          className="flex w-1/2 items-center justify-center gap-1 border-l border-[var(--border)] py-2.5 text-[10px] font-bold uppercase text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20V10M18 20V4M6 20v-4" />
          </svg>
          Phone Finder
        </Link>
      </div>
    </div>
  );
}
