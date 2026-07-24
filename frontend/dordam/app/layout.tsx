import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DorDam — Phone Specs, Prices & Reviews in Bangladesh",
    template: "%s — DorDam",
  },
  description:
    "DorDam is Bangladesh's phone catalog: full specifications, price comparisons across stores, reviews, news and a powerful phone finder.",
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
      <body className="flex min-h-full flex-col bg-[var(--canvas)]">
        <Header />
        <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 py-5">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
