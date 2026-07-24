import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — DorDam",
  description: "How DorDam handles your data.",
};

const SECTIONS = [
  {
    heading: "Information We Collect",
    body: "DorDam is a demonstration project. We do not collect personal information beyond what is required for the features you use. Any account details entered are stored locally in your browser for demo purposes only.",
  },
  {
    heading: "How We Use Information",
    body: "Information is used solely to provide catalog browsing, comparison and search features. We do not sell or share your data with third parties.",
  },
  {
    heading: "Cookies & Local Storage",
    body: "We use browser local storage to remember preferences such as your compare list. No tracking cookies are set.",
  },
  {
    heading: "Third-Party Content",
    body: "Phone images and specifications are aggregated from public sources. Trademarks and images belong to their respective owners.",
  },
  {
    heading: "Contact",
    body: "For privacy questions, reach us through the Contact page.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="text-3xl font-extrabold text-[var(--text)]">Privacy Policy</h1>
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
