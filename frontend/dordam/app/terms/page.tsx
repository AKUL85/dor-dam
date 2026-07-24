import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — DorDam",
  description: "Terms governing use of DorDam.",
};

const SECTIONS = [
  {
    heading: "Acceptance of Terms",
    body: "By using DorDam you agree to these terms. This is a demonstration platform provided as-is, without warranty of any kind.",
  },
  {
    heading: "Use of the Service",
    body: "You may browse, compare and search the catalog for personal, non-commercial use. Automated scraping of this site is not permitted.",
  },
  {
    heading: "Accuracy of Information",
    body: "Specifications and prices are aggregated from public sources and may be inaccurate or outdated. Always verify details with the retailer before purchasing.",
  },
  {
    heading: "Intellectual Property",
    body: "Phone names, logos and images are the property of their respective manufacturers. DorDam claims no ownership over third-party trademarks.",
  },
  {
    heading: "Limitation of Liability",
    body: "DorDam is not liable for any decisions made based on information presented on this site.",
  },
];

export default function TermsPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="text-3xl font-extrabold text-[var(--text)]">Terms of Service</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated: July 2026</p>
        <div className="mt-6 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-bold text-[var(--text)]">{s.heading}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
