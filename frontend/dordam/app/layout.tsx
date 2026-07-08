import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import GlobalSidebar from "@/components/GlobalSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DorDam - Phone Specs & Prices",
  description: "DorDam Phone catalog & specs comparison",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col items-center">
        <Header />
        <div className="w-full max-w-[1200px] flex-1 px-4 py-4 flex gap-4">
          <GlobalSidebar />
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
        
        {/* Footer */}
        <footer className="w-full border-t border-[var(--border)] bg-[var(--bg-secondary)] mt-10">
          <div className="mx-auto max-w-[1200px] px-4 py-8">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">Browse</h4>
                <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
                  <li><a href="/phones" className="hover:text-[var(--accent)]">All Phones</a></li>
                  <li><a href="/brands" className="hover:text-[var(--accent)]">Brands</a></li>
                  <li><a href="/compare" className="hover:text-[var(--accent)]">Compare</a></li>
                  <li><a href="/finder" className="hover:text-[var(--accent)]">Phone Finder</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">Popular</h4>
                <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
                  <li><a href="/phones?brand=samsung" className="hover:text-[var(--accent)]">Samsung</a></li>
                  <li><a href="/phones?brand=apple" className="hover:text-[var(--accent)]">Apple</a></li>
                  <li><a href="/phones?brand=xiaomi" className="hover:text-[var(--accent)]">Xiaomi</a></li>
                  <li><a href="/phones?brand=realme" className="hover:text-[var(--accent)]">Realme</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">Resources</h4>
                <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
                  <li><a href="#" className="hover:text-[var(--accent)]">About</a></li>
                  <li><a href="#" className="hover:text-[var(--accent)]">Contact</a></li>
                  <li><a href="#" className="hover:text-[var(--accent)]">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-[var(--accent)]">Terms</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">Follow</h4>
                <div className="flex gap-3">
                  <a href="#" className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-card)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                  </a>
                  <a href="#" className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-card)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                  </a>
                  <a href="#" className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-card)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-6 border-t border-[var(--border)] pt-4 text-center text-[11px] text-[var(--text-muted)]">
              © 2026 DorDam.com — Phone specifications, prices & comparison in Bangladesh
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
