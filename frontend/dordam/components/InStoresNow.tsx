import Link from "next/link";
import { type PhoneCard } from "@/lib/api";

export default function InStoresNow({ phones }: { phones: PhoneCard[] }) {
  return (
    <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
          In Stores Now
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3">
        {phones.slice(0, 9).map((p) => (
          <Link
            key={p.slug}
            href={`/phones/${p.slug}`}
            className="group flex flex-col items-center text-center"
          >
            <div className="mb-1.5 flex h-[60px] w-full items-center justify-center rounded bg-[var(--bg-secondary)] p-1.5 transition-colors group-hover:bg-[var(--bg-elevated)]">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                </svg>
              )}
            </div>
            <span className="line-clamp-2 text-[10px] font-medium leading-tight text-[var(--text-secondary)] group-hover:text-[var(--accent)]">
              {p.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
