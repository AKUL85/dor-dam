import Link from "next/link";
import type { PhoneCard as PhoneCardT } from "@/lib/api";

// Small helper — picks 3-4 key specs for the card overlay
function chipSpecs(ks: PhoneCardT["keySpecs"]) {
  const out: { icon: string; text: string }[] = [];
  if (ks.display) out.push({ icon: "📱", text: ks.display.split(",")[0] });
  if (ks.chipset) out.push({ icon: "⚡", text: ks.chipset.split("(")[0].trim() });
  if (ks.ram) out.push({ icon: "🧠", text: ks.ram });
  if (ks.battery) out.push({ icon: "🔋", text: ks.battery });
  if (ks.camera) out.push({ icon: "📷", text: ks.camera.split(",")[0] });
  return out.slice(0, 4);
}

export default function PhoneCard({ phone }: { phone: PhoneCardT }) {
  const chips = chipSpecs(phone.keySpecs);

  return (
    <Link
      href={`/phones/${phone.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#1a2235] transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/[0.07] hover:-translate-y-1"
    >
      {/* Image area */}
      <div className="relative flex h-52 items-center justify-center bg-gradient-to-b from-slate-800/40 to-transparent p-4">
        {phone.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={phone.image}
            alt={phone.name}
            className="h-full max-h-44 w-auto object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-32 w-24 items-center justify-center rounded-lg bg-slate-700/50 text-slate-500">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
        )}

        {/* Year badge */}
        {phone.releaseYear && (
          <span className="absolute right-3 top-3 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300 backdrop-blur-sm">
            {phone.releaseYear}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-blue-400">{phone.brand}</p>
        <h3 className="text-sm font-semibold leading-tight text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
          {phone.name}
        </h3>

        {/* Key spec chips */}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {chips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-slate-400"
            >
              <span className="text-[10px]">{c.icon}</span> {c.text}
            </span>
          ))}
        </div>

        {/* Price hint */}
        {phone.priceHint && (
          <p className="mt-1 truncate text-xs text-emerald-400/80">
            {phone.priceHint.split("/")[0].trim()}
          </p>
        )}
      </div>
    </Link>
  );
}
