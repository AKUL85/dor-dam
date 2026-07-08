import { fetchBrands } from "@/lib/api";
import Link from "next/link";
import BrandSidebar from "@/components/BrandSidebar";

export default async function AllBrandsPage() {
  const brands = await fetchBrands();

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
            All Brands
          </h1>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {brands.map((b) => (
            <Link
              key={b.slug}
              href={`/brands/${b.slug}`}
              className="group flex flex-col justify-center border border-zinc-100 bg-zinc-50 p-3 hover:bg-white hover:border-zinc-300 transition-colors"
            >
              <span className="text-[14px] font-bold text-zinc-800 group-hover:text-accent">
                {b.name}
              </span>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wide mt-1">
                {b.phoneCount} devices
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
