import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="text-6xl">📵</span>
      <h1 className="mt-6 text-4xl font-extrabold text-[var(--text)]">404 — Not Found</h1>
      <p className="mt-3 max-w-md text-[var(--text-secondary)]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--accent-hover)]"
        >
          Go Home
        </Link>
        <Link
          href="/phones"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
        >
          Browse Phones
        </Link>
      </div>
    </div>
  );
}
