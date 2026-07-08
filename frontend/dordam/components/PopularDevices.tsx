import Link from "next/link";
import { type PhoneCard } from "@/lib/api";

export default function PopularDevices({ phones }: { phones: PhoneCard[] }) {
  return (
    <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
          Popular Devices
        </h3>
      </div>
      
      <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-6">
        {phones.slice(0, 6).map((p) => (
          <Link
            key={p.slug}
            href={`/phones/${p.slug}`}
            className="group flex flex-col items-center text-center"
          >
            <div className="mb-2 flex h-[80px] w-full items-center justify-center rounded-md bg-[var(--bg-secondary)] p-2 transition-colors group-hover:bg-[var(--bg-elevated)]">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                </svg>
              )}
            </div>
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-[var(--text-secondary)] group-hover:text-[var(--accent)]">
              {p.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
