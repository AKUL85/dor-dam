import type { Metadata } from "next";
import { fetchPhones, fetchBrands } from "@/lib/api";
import PhoneCard from "@/components/common/PhoneCard";
import Pagination from "@/components/common/Pagination";
import PhoneListFilters from "./PhoneListFilters";

export const metadata: Metadata = {
  title: "All Phones — DorDam",
  description:
    "Browse the full phone catalog. Filter by brand, year and sort by popularity, release date or name.",
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const str = (v: string | string[] | undefined): string | undefined =>
  typeof v === "string" && v ? v : undefined;

export default async function PhonesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const search = str(sp.search);
  const brand = str(sp.brand);
  const year = str(sp.year);
  const sort = str(sp.sort) ?? "popularity";
  const page = Number(str(sp.page)) || 1;

  const [{ items, total, totalPages }, brands] = await Promise.all([
    fetchPhones({ search, brand, year, sort, page, pageSize: 40 }),
    fetchBrands(),
  ]);

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          {search ? `Search results for “${search}”` : brand ? `${brand} phones` : "All Phones"}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {total.toLocaleString()} {total === 1 ? "device" : "devices"} found
        </p>
      </div>

      <PhoneListFilters
        brands={brands}
        currentBrand={brand}
        currentYear={year}
        currentSort={sort}
        currentSearch={search}
      />

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-muted)] shadow-[var(--shadow-sm)]">
          No phones match your filters. Try clearing some.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <PhoneCard key={p.slug} phone={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(n) => {
              const qs = new URLSearchParams();
              if (search) qs.set("search", search);
              if (brand) qs.set("brand", brand);
              if (year) qs.set("year", year);
              if (sort !== "popularity") qs.set("sort", sort);
              if (n > 1) qs.set("page", String(n));
              const s = qs.toString();
              return s ? `/phones?${s}` : "/phones";
            }}
          />
        </div>
      )}
    </div>
  );
}
