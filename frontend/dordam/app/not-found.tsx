import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="text-6xl">📵</span>
      <h1 className="mt-6 text-4xl font-bold text-white">404 — Not Found</h1>
      <p className="mt-3 max-w-md text-slate-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-600"
        >
          Go Home
        </Link>
        <Link
          href="/phones"
          className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          Browse Phones
        </Link>
      </div>
    </div>
  );
}
