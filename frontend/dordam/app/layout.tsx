import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GlobalSidebar from "@/components/GlobalSidebar";
import ChatWidget from "@/components/chat/ChatWidget";

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
        <div className="w-full max-w-[1200px] flex-1 px-4 py-4 flex gap-4 mx-auto">
          <GlobalSidebar />
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
        
        <Footer />

        {/* Global AI chat assistant — fixed-positioned, doesn't affect layout. */}
        <ChatWidget />
      </body>
    </html>
  );
}
