import { fetchPhones } from "@/lib/api";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PhonesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qStr = typeof sp.search === "string" ? sp.search : "";
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;

  const { items: phones, total, totalPages } = await fetchPhones({
    search: qStr,
    page,
    pageSize: 40,
  });

  return (
    <div className="flex flex-col min-w-0 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">
          {qStr ? `Search results for "${qStr}"` : "All Phones"}
        </h1>
        <p className="text-[12px] text-[var(--text-muted)] mt-1">Found {total} results</p>
      </div>

      {phones.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-muted)]">
          No phones found matching your criteria.
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {phones.map((p) => (
            <Link
              key={p.slug}
              href={`/phones/${p.slug}`}
              className="flex flex-col items-center text-center group"
            >
              <div className="mb-3 flex h-32 w-full items-center justify-center rounded-md bg-[var(--bg-secondary)] p-2 transition-colors group-hover:bg-[var(--bg-elevated)]">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  </svg>
                )}
              </div>
              <span className="text-[12px] font-bold leading-tight text-[var(--text-secondary)] group-hover:text-[var(--accent)]">
                {p.name}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[var(--border)] flex justify-center gap-3 text-sm font-bold">
          {page > 1 && (
            <Link href={`/phones?search=${encodeURIComponent(qStr)}&page=${page - 1}`} className="text-[var(--accent)] hover:underline">
              ← Prev
            </Link>
          )}
          <span className="text-[var(--text-muted)]">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/phones?search=${encodeURIComponent(qStr)}&page=${page + 1}`} className="text-[var(--accent)] hover:underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
