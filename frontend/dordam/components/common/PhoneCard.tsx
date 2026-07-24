import Link from "next/link";
import type { PhoneCard as PhoneCardT } from "@/lib/api";

/** Picks up to 4 key specs for the card footer chips. */
function chipSpecs(ks: PhoneCardT["keySpecs"]) {
  const out: { icon: string; text: string }[] = [];
  if (ks.display) out.push({ icon: "▭", text: ks.display.split(",")[0] });
  if (ks.chipset) out.push({ icon: "⚡", text: ks.chipset.split("(")[0].trim() });
  if (ks.ram) out.push({ icon: "≡", text: ks.ram });
  if (ks.battery) out.push({ icon: "⁝", text: ks.battery });
  if (ks.camera) out.push({ icon: "◉", text: ks.camera.split(",")[0] });
  return out.slice(0, 4);
}

export default function PhoneCard({ phone }: { phone: PhoneCardT }) {
  const chips = chipSpecs(phone.keySpecs);

  return (
    <Link
      href={`/phones/${phone.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
    >
      {/* Image */}
      <div className="relative flex h-48 items-center justify-center bg-[var(--surface-2)] p-4">
        {phone.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={phone.image}
            alt={phone.name}
            className="h-full max-h-40 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-28 w-20 items-center justify-center rounded-lg bg-[var(--surface-3)] text-[var(--text-muted)]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
        )}
        {phone.releaseYear && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
            {phone.releaseYear}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          {phone.brand}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
          {phone.name}
        </h3>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {chips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-3)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
            >
              <span className="text-[10px] text-[var(--text-muted)]">{c.icon}</span> {c.text}
            </span>
          ))}
        </div>

        {phone.priceHint && (
          <p className="mt-1 truncate text-xs font-medium text-[var(--success)]">
            {phone.priceHint.split("/")[0].trim()}
          </p>
        )}
      </div>
    </Link>
  );
}
