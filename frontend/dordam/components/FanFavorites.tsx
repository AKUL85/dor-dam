import Link from "next/link";
import { type PhoneCard } from "@/lib/api";

export default function FanFavorites({ phones }: { phones: PhoneCard[] }) {
  return (
    <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
          Top 10 by Fans
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
        {phones.slice(0, 10).map((p, idx) => (
          <Link
            key={p.slug}
            href={`/phones/${p.slug}`}
            className="group flex flex-col items-center text-center"
          >
            <div className="relative mb-2 flex h-[100px] w-full items-center justify-center rounded-md bg-[var(--bg-secondary)] p-2 transition-colors group-hover:bg-[var(--bg-elevated)]">
              <span className="absolute top-1 left-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                {idx + 1}
              </span>
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-10 items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  </svg>
                </div>
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
