import Link from "next/link";
import SearchBox from "./SearchBox";

export default function Header() {
  return (
    <header className="w-full">
      {/* Top Dark Bar */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between px-4 py-3 sm:flex-row">
          {/* Logo */}
          <Link href="/" className="mb-3 flex items-center gap-2 sm:mb-0">
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              <span className="text-[var(--accent)]">Dor</span>Dam
              <span className="text-xs font-normal text-[var(--text-muted)]">.com</span>
            </span>
          </Link>

          {/* Search */}
          <div className="w-full max-w-md px-4 sm:px-0">
            <SearchBox compact />
          </div>

          {/* Right Icons / Nav */}
          <div className="hidden items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] md:flex">
            <Link href="#" className="transition-colors hover:text-[var(--text-primary)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </Link>
            <Link href="#" className="transition-colors hover:text-[var(--text-primary)]">Log In</Link>
            <Link href="#" className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-white transition-colors hover:bg-[var(--accent-hover)]">Sign Up</Link>
          </div>
        </div>
      </div>

      {/* Navigation Ribbon */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="mx-auto max-w-[1200px] overflow-x-auto px-4">
          <nav className="flex items-center justify-start gap-6 whitespace-nowrap py-2.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)] sm:justify-center md:gap-8">
            <Link href="/" className="text-[var(--accent)]">Home</Link>
            <Link href="/news" className="transition-colors hover:text-[var(--text-primary)]">News</Link>
            <Link href="/reviews" className="transition-colors hover:text-[var(--text-primary)]">Reviews</Link>
            <Link href="/videos" className="transition-colors hover:text-[var(--text-primary)]">Videos</Link>
            <Link href="/phones" className="transition-colors hover:text-[var(--text-primary)]">Phones</Link>
            <Link href="/brands" className="transition-colors hover:text-[var(--text-primary)]">Brands</Link>
            <Link href="/compare" className="transition-colors hover:text-[var(--text-primary)]">Compare</Link>
            <Link href="/finder" className="transition-colors hover:text-[var(--text-primary)]">Phone Finder</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
