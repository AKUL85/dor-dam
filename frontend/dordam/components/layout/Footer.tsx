import Link from "next/link";

const COLUMNS = [
  {
    title: "Browse",
    links: [
      { href: "/phones", label: "All Phones" },
      { href: "/brands", label: "Brands" },
      { href: "/compare", label: "Compare" },
      { href: "/finder", label: "Phone Finder" },
    ],
  },
  {
    title: "Content",
    links: [
      { href: "/news", label: "News" },
      { href: "/reviews", label: "Reviews" },
      { href: "/videos", label: "Videos" },
    ],
  },
  {
    title: "Popular Brands",
    links: [
      { href: "/phones?brand=Samsung", label: "Samsung" },
      { href: "/phones?brand=Apple", label: "Apple" },
      { href: "/phones?brand=Xiaomi", label: "Xiaomi" },
      { href: "/phones?brand=Realme", label: "Realme" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-12 w-full bg-header text-[var(--text-on-dark-muted)]">
      <div className="mx-auto max-w-[var(--content-max)] px-4 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">
                {col.title}
              </h4>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-[var(--accent)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <Link href="/" className="text-lg font-extrabold text-white">
            <span className="text-[var(--accent)]">Dor</span>Dam
            <span className="ml-1 text-xs font-normal text-[var(--text-on-dark-muted)]">
              .com.bd
            </span>
          </Link>
          <p className="text-xs">
            © {2026} DorDam. Phone specs &amp; prices in Bangladesh. Data for demo purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}
