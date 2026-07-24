import type { Metadata } from "next";
import Link from "next/link";
import { fetchBrands } from "@/lib/api";

export const metadata: Metadata = {
  title: "Brands — DorDam",
  description: "Browse all phone brands and manufacturers in the DorDam catalog.",
};

/** Group brands alphabetically by first letter for a directory-style index. */
function groupByLetter(brands: { name: string; slug: string; phoneCount: number }[]) {
  const groups = new Map<string, typeof brands>();
  for (const b of brands) {
    const letter = /[a-z]/i.test(b.name[0]) ? b.name[0].toUpperCase() : "#";
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(b);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export default async function BrandsPage() {
  const brands = await fetchBrands();
  const groups = groupByLetter(brands);

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[var(--text)]">All Brands</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {brands.length} manufacturers in the catalog
        </p>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-muted)] shadow-[var(--shadow-sm)]">
          No brands available yet. Run the catalog scraper to populate data.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([letter, items]) => (
            <section key={letter}>
              <h2 className="section-title mb-3">{letter}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/brands/${b.slug}`}
                    className="group flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)]"
                  >
                    <span className="font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
                      {b.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{b.phoneCount}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
