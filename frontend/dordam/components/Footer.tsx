import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#080c14]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </span>
              <span className="text-lg font-bold text-white">
                Dor<span className="text-blue-400">Dam</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              Your ultimate mobile phone database. Detailed specifications, comparisons, and more.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { href: "/brands", label: "All Brands" },
                { href: "/phones", label: "All Phones" },
                { href: "/finder", label: "Phone Finder" },
                { href: "/compare", label: "Compare Phones" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-400 transition-colors hover:text-blue-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Brands */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">Popular Brands</h3>
            <ul className="space-y-2">
              {["Apple", "Samsung", "Google", "Xiaomi", "OnePlus", "Nothing"].map((b) => (
                <li key={b}>
                  <Link
                    href={`/phones?brand=${b}`}
                    className="text-sm text-slate-400 transition-colors hover:text-blue-400"
                  >
                    {b}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">About</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Phone specifications data sourced from GSMArena. This is an independent project for educational purposes.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} DorDam — Specifications sourced from GSMArena.com
        </div>
      </div>
    </footer>
  );
}
