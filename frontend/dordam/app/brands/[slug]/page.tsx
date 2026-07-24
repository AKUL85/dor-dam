import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchBrands, fetchPhones } from "@/lib/api";
import PhoneCard from "@/components/common/PhoneCard";
import Pagination from "@/components/common/Pagination";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function resolveBrand(slug: string) {
  const brands = await fetchBrands();
  return brands.find(
    (b) => b.slug === slug || b.name.toLowerCase() === slug.toLowerCase()
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await resolveBrand(slug);
  const name = brand?.name ?? slug;
  return {
    title: `${name} phones — DorDam`,
    description: `Browse all ${name} phones with full specifications and prices.`,
  };
}

export default async function BrandDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;

  const brand = await resolveBrand(slug);
  const brandName = brand?.name ?? slug;

  const { items, total, totalPages } = await fetchPhones({
    brand: brandName,
    page,
    pageSize: 40,
    sort: "newest",
  });

  if (!brand && items.length === 0) notFound();

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[var(--text)]">{brandName} phones</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {total.toLocaleString()} {total === 1 ? "device" : "devices"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-muted)] shadow-[var(--shadow-sm)]">
          No phones found for this brand.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <PhoneCard key={p.slug} phone={p} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={page}
              totalPages={totalPages}
              hrefFor={(n) => `/brands/${slug}?page=${n}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
