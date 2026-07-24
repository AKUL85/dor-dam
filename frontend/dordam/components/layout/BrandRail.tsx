import Link from "next/link";
import { fetchBrands, type Brand } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
//  BrandRail — the persistent brand list (GSMArena's left column).
//  Server component. Callers may pass a pre-fetched `brands` list
//  (to avoid a duplicate request); otherwise it fetches its own.
//  Fails soft to an empty list when the backend is unavailable.
// ─────────────────────────────────────────────────────────────
interface Props {
  brands?: Brand[];
  activeBrand?: string;
}

export default async function BrandRail({ brands, activeBrand }: Props) {
  let list: Brand[] = brands ?? [];
  if (!brands) {
    try {
      list = await fetchBrands();
    } catch {
      // API offline — render the empty state rather than crashing.
    }
  }

  const activeKey = activeBrand?.toLowerCase();

  return (
    <div className="card overflow-hidden">
      <div className="section-title border-b border-[var(--border)] px-4 py-3">
        Brands
      </div>
      {list.length === 0 ? (
        <p className="px-4 py-3 text-xs text-[var(--text-muted)]">
          Brand list unavailable.
        </p>
      ) : (
        <ul className="max-h-[70vh] overflow-y-auto py-1">
          {list.map((b) => {
            const isActive =
              activeKey && (b.slug.toLowerCase() === activeKey || b.name.toLowerCase() === activeKey);
            return (
              <li key={b.slug}>
                <Link
                  href={`/brands/${b.slug}`}
                  className={`flex items-center justify-between px-4 py-1.5 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--accent)] ${
                    isActive
                      ? "font-semibold text-[var(--accent)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  <span>{b.name}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {b.phoneCount}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
