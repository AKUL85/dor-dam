import Link from "next/link";
import { type PhoneCard } from "@/lib/api";

interface ComparisonPair {
  phone1: PhoneCard;
  phone2: PhoneCard;
}

export default function PopularComparisons({ phones }: { phones: PhoneCard[] }) {
  // Generate comparison pairs from popular phones
  const pairs: ComparisonPair[] = [];
  for (let i = 0; i < phones.length - 1 && pairs.length < 10; i += 2) {
    pairs.push({ phone1: phones[i], phone2: phones[i + 1] });
  }

  if (pairs.length === 0) return null;

  return (
    <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
          Popular Comparisons
        </h3>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {pairs.map((pair, idx) => (
          <Link
            key={idx}
            href={`/compare?slugs=${pair.phone1.slug},${pair.phone2.slug}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {pair.phone1.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pair.phone1.image} alt="" className="h-10 w-8 shrink-0 object-contain" />
              )}
              <span className="truncate text-xs font-medium text-[var(--text-secondary)]">
                {pair.phone1.name}
              </span>
            </div>

            <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
              VS
            </span>

            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="truncate text-xs font-medium text-[var(--text-secondary)] text-right">
                {pair.phone2.name}
              </span>
              {pair.phone2.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pair.phone2.image} alt="" className="h-10 w-8 shrink-0 object-contain" />
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="border-t border-[var(--border)] px-4 py-2.5 text-center">
        <Link href="/compare" className="text-xs font-semibold text-[var(--accent)] hover:underline">
          Compare any two phones →
        </Link>
      </div>
    </div>
  );
}
