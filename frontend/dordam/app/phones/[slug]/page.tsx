import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPhone, fetchPhones, fetchBrands } from "@/lib/api";
import SpecTable from "@/components/device/SpecTable";
import PhoneCard from "@/components/common/PhoneCard";
import BrandRail from "@/components/layout/BrandRail";
import CompareButton from "./CompareButton";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const phone = await fetchPhone(slug);
  if (!phone) return { title: "Phone not found — DorDam" };
  return {
    title: `${phone.modelName} — Full Specs — DorDam`,
    description: `${phone.modelName} full specifications: display, chipset, camera, battery and more.`,
  };
}

/** A labelled quick-spec tile in the hero strip. */
function QuickSpec({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[var(--accent)]">{icon}</span>
      <div className="flex flex-col">
        <span className="text-lg font-extrabold leading-none text-[var(--text)]">{value}</span>
        <span className="mt-1 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
      </div>
    </div>
  );
}

export default async function PhoneDetailPage({ params }: Props) {
  const { slug } = await params;
  const phone = await fetchPhone(slug);
  if (!phone) notFound();

  const [brands, related] = await Promise.all([
    fetchBrands(),
    fetchPhones({ brand: phone.brand, sort: "popularity", pageSize: 5 }),
  ]);
  const relatedPhones = related.items.filter((p) => p.slug !== phone.slug).slice(0, 4);

  const ks = phone.keySpecs ?? {};

  return (
    <div className="animate-fade-in flex flex-col gap-4 lg:flex-row">
      {/* Brand rail */}
      <aside className="hidden w-[190px] shrink-0 lg:block">
        <BrandRail brands={brands} activeBrand={phone.brand} />
      </aside>

      <div className="min-w-0 flex-1">
        {/* Breadcrumb */}
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--accent)]">Home</Link>
          <span>/</span>
          <Link href={`/phones?brand=${encodeURIComponent(phone.brand)}`} className="hover:text-[var(--accent)]">{phone.brand}</Link>
          <span>/</span>
          <span className="truncate text-[var(--text-secondary)]">{phone.modelName}</span>
        </nav>

        {/* Hero card */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">{phone.brand}</p>
              <h1 className="text-2xl font-extrabold leading-tight text-[var(--text)]">{phone.modelName}</h1>
            </div>
            <CompareButton slug={phone.slug} name={phone.modelName} />
          </div>

          <div className="flex flex-col gap-4 p-5 md:flex-row">
            {/* Image */}
            <div className="flex w-full shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-2)] p-4 md:w-56">
              {phone.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={phone.imageUrl} alt={phone.modelName} className="max-h-64 w-auto object-contain" />
              ) : (
                <div className="flex h-56 w-full items-center justify-center text-[var(--text-muted)]">No image</div>
              )}
            </div>

            {/* Quick specs */}
            <div className="flex flex-1 flex-col">
              <div className="grid flex-1 grid-cols-2 gap-5 lg:grid-cols-4">
                {ks.display && (
                  <QuickSpec
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2" /></svg>}
                    value={`${ks.display.split(" ")[0]}"`}
                    label="Display"
                  />
                )}
                {ks.camera && (
                  <QuickSpec
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>}
                    value={ks.camera.split(" ")[0]}
                    label="Main camera"
                  />
                )}
                {ks.ram && (
                  <QuickSpec
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="7" width="16" height="10" rx="1" /><path d="M8 7V5m4 2V5m4 2V5" /></svg>}
                    value={ks.ram}
                    label="RAM"
                  />
                )}
                {ks.battery && (
                  <QuickSpec
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="8" width="16" height="8" rx="1" /><path d="M21 11v2" /></svg>}
                    value={ks.battery.split(" ")[0]}
                    label="Battery"
                  />
                )}
              </div>

              {/* Quick text info */}
              <div className="mt-4 grid grid-cols-2 gap-y-2 border-t border-[var(--border)] pt-4 text-[13px] text-[var(--text-secondary)]">
                {phone.quickSpecs?.released && <div><strong className="text-[var(--text)]">Released:</strong> {phone.quickSpecs.released}</div>}
                {phone.quickSpecs?.body && <div><strong className="text-[var(--text)]">Body:</strong> {phone.quickSpecs.body}</div>}
                {phone.quickSpecs?.os && <div><strong className="text-[var(--text)]">OS:</strong> {phone.quickSpecs.os}</div>}
                {phone.quickSpecs?.storage && <div><strong className="text-[var(--text)]">Storage:</strong> {phone.quickSpecs.storage}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Full specs */}
        <div className="mt-5">
          <h2 className="section-title mb-3">Full Specifications</h2>
          <SpecTable specs={phone.specs ?? {}} />
        </div>

        {/* Related */}
        {relatedPhones.length > 0 && (
          <div className="mt-6">
            <h2 className="section-title mb-3">More from {phone.brand}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {relatedPhones.map((p) => (
                <PhoneCard key={p.slug} phone={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
