import { fetchBrands, fetchPhones } from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandSidebar from "@/components/BrandSidebar";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const brands = await fetchBrands();
  const brandObj = brands.find((b) => b.slug === slug || b.name.toLowerCase() === slug.toLowerCase());

  const { items: phones, totalPages } = await fetchPhones({ brand: brandObj?.name || slug, pageSize: 80 });

  if (!phones.length) notFound();

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Left Sidebar */}
      <aside className="w-full md:w-[160px] lg:w-[180px] shrink-0 hidden md:block">
        <BrandSidebar brands={brands} />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="bg-[#f8f8f8] px-4 py-3 border-b border-zinc-200">
          <h1 className="text-[20px] font-bold text-zinc-800">
            {brandObj ? `${brandObj.name} phones` : "Phones"}
          </h1>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {phones.map((p) => (
            <Link
              key={p.slug}
              href={`/phones/${p.slug}`}
              className="flex flex-col items-center text-center group"
            >
              <div className="mb-3 flex h-32 w-full items-center justify-center">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-16 bg-zinc-100" />
                )}
              </div>
              <span className="text-[13px] font-bold leading-tight text-[#c8102e] group-hover:underline">
                {p.name.replace(p.brand, '').trim()}
              </span>
            </Link>
          ))}
        </div>

        {/* Simplistic Pagination if totalPages > 1 */}
        {totalPages > 1 && (
          <div className="bg-[#f8f8f8] px-4 py-3 border-t border-zinc-200 flex justify-center gap-2 text-sm font-bold">
            <span className="text-zinc-500">Page 1 of {totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
}
