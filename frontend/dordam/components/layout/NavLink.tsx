"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─────────────────────────────────────────────────────────────
//  Nav ribbon link that highlights when its route is active.
// ─────────────────────────────────────────────────────────────
export default function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`relative py-1 transition-colors ${
        active ? "text-white" : "text-[var(--text-on-dark-muted)] hover:text-white"
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-[9px] left-0 h-[2px] w-full rounded-full bg-[var(--accent)]" />
      )}
    </Link>
  );
}
