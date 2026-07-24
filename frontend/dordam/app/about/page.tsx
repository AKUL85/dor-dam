import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — DorDam",
  description:
    "DorDam is a phone catalog, specs and price-comparison platform for Bangladesh.",
};

export default function AboutPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="text-3xl font-extrabold text-[var(--text)]">About DorDam</h1>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          <p>
            <strong className="text-[var(--text)]">DorDam</strong> (দর-দাম) is a
            phone catalog and price-comparison platform built for the Bangladesh
            market. We help you find detailed specifications, compare devices
            side-by-side, and track prices across local retailers.
          </p>
          <p>
            Browse the full catalog of phones, filter by brand, year and specs
            with our Phone Finder, and read the latest news, reviews and videos —
            all in one place.
          </p>
          <p>
            This is a demonstration build. Editorial content (news, reviews,
            videos) currently uses sample data, while the phone catalog is served
            from a live scraping backend.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/phones"
            className="rounded-[var(--radius-md)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Browse Phones
          </Link>
          <Link
            href="/finder"
            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Try Phone Finder
          </Link>
        </div>
      </div>
    </div>
  );
}
