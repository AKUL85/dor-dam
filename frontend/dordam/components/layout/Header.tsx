import Link from "next/link";
import SearchBox from "@/components/common/SearchBox";
import NavLink from "@/components/layout/NavLink";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/reviews", label: "Reviews" },
  { href: "/videos", label: "Videos" },
  { href: "/phones", label: "Phones" },
  { href: "/brands", label: "Brands" },
  { href: "/compare", label: "Compare" },
  { href: "/finder", label: "Phone Finder" },
];

export default function Header() {
  return (
    <header className="w-full">
      {/* Top dark bar */}
      <div className="bg-header">
        <div className="mx-auto flex max-w-[var(--content-max)] flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              <span className="text-[var(--accent)]">Dor</span>Dam
            </span>
            <span className="ml-1 text-xs font-normal text-[var(--text-on-dark-muted)]">
              .com.bd
            </span>
          </Link>

          {/* Search */}
          <div className="w-full max-w-md">
            <SearchBox />
          </div>

          {/* Auth */}
          <div className="hidden items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-on-dark-muted)] md:flex">
            <Link href="/login" className="transition-colors hover:text-white">
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Nav ribbon */}
      <div className="bg-header-2 shadow-sm">
        <div className="mx-auto max-w-[var(--content-max)] overflow-x-auto px-4">
          <nav className="flex items-center justify-start gap-6 whitespace-nowrap py-2.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-on-dark-muted)] sm:justify-center md:gap-8">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
