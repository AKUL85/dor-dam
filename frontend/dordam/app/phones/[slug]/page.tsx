import { fetchPhone, fetchPhones, fetchBrands } from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandSidebar from "@/components/BrandSidebar";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PhoneDetailPage({ params }: Props) {
  const { slug } = await params;
  const phone = await fetchPhone(slug);
  if (!phone) notFound();

  const brands = await fetchBrands();

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Left Sidebar */}
      <aside className="w-full md:w-[160px] lg:w-[180px] shrink-0 hidden md:block">
        <BrandSidebar brands={brands} />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white shadow-sm ring-1 ring-zinc-200">
        
        {/* Title Header */}
        <div className="bg-white px-4 pt-4 pb-2 border-b-2 border-accent flex justify-between items-end">
          <h1 className="text-[28px] font-bold text-[#d50000] leading-none">
            {phone.modelName}
          </h1>
        </div>

        <div className="flex flex-col md:flex-row border-b border-zinc-200">
          {/* Phone Hero Image */}
          <div className="flex w-full md:w-64 shrink-0 flex-col items-center justify-start p-4 bg-white">
            {phone.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={phone.imageUrl} alt={phone.modelName} className="max-h-64 object-contain" />
            ) : (
              <div className="h-64 w-full bg-zinc-100 flex items-center justify-center text-zinc-400">No Image</div>
            )}
          </div>

          {/* Quick Specs Strip */}
          <div className="flex-1 bg-[#fbfbfb] p-4 border-l border-zinc-200 flex flex-col">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              {phone.keySpecs?.display && (
                <div className="flex items-start gap-2">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-zinc-800 leading-none">{phone.keySpecs.display.split(' ')[0]}"</span>
                    <span className="text-[11px] uppercase text-zinc-500">{phone.quickSpecs?.displayRes || "Resolution"}</span>
                  </div>
                </div>
              )}
              {phone.keySpecs?.camera && (
                <div className="flex items-start gap-2">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-zinc-800 leading-none">{phone.keySpecs.camera.split(' ')[0]}</span>
                    <span className="text-[11px] uppercase text-zinc-500">Megapixels</span>
                  </div>
                </div>
              )}
              {phone.keySpecs?.ram && (
                <div className="flex items-start gap-2">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-zinc-800 leading-none">{phone.keySpecs.ram}</span>
                    <span className="text-[11px] uppercase text-zinc-500">{phone.keySpecs.chipset || "RAM"}</span>
                  </div>
                </div>
              )}
              {phone.keySpecs?.battery && (
                <div className="flex items-start gap-2">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v10H4z M20 10h2v4h-2z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-zinc-800 leading-none">{phone.keySpecs.battery.split(' ')[0]}</span>
                    <span className="text-[11px] uppercase text-zinc-500">mAh Battery</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick text info */}
            <div className="mt-4 pt-4 border-t border-zinc-200 grid grid-cols-2 gap-y-2 text-[12px] text-zinc-600">
              {phone.quickSpecs?.released && <div><strong className="text-zinc-800">Released:</strong> {phone.quickSpecs.released}</div>}
              {phone.quickSpecs?.body && <div><strong className="text-zinc-800">Body:</strong> {phone.quickSpecs.body}</div>}
              {phone.quickSpecs?.os && <div><strong className="text-zinc-800">OS:</strong> {phone.quickSpecs.os}</div>}
              {phone.quickSpecs?.storage && <div><strong className="text-zinc-800">Storage:</strong> {phone.quickSpecs.storage}</div>}
            </div>
          </div>
        </div>

        {/* Specs Tables */}
        <div className="p-4 bg-white">
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              {Object.entries(phone.specs || {}).map(([section, attributes], idx) => (
                <tr key={section} className={idx !== 0 ? "border-t border-zinc-200" : ""}>
                  {/* Category Title Header */}
                  <th className="w-[120px] align-top text-left py-2 pr-4 font-bold text-[#c8102e] uppercase text-[14px]">
                    {section}
                  </th>
                  <td className="p-0 align-top">
                    <table className="w-full">
                      <tbody>
                        {Object.entries(attributes).map(([key, val]) => (
                          <tr key={key} className="border-b border-zinc-100 last:border-0 group">
                            <td className="w-[140px] py-2 pr-4 font-bold text-[#555] align-top bg-white group-hover:bg-zinc-50">
                              {key === "_" ? "" : key}
                            </td>
                            <td className="py-2 text-[#333] align-top bg-white group-hover:bg-zinc-50">
                              {val}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
