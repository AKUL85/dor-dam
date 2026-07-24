import type { Metadata } from "next";
import Link from "next/link";
import { getNews } from "@/lib/mock";
import NewsCard from "@/components/common/NewsCard";

export const metadata: Metadata = {
  title: "News — DorDam",
  description:
    "Latest mobile phone news, price drops, launches, and updates in Bangladesh",
};

export default async function NewsPage() {
  const articles = await getNews();
  const [lead, ...rest] = articles;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">News</h1>
        <p className="text-sm text-ink-muted">
          Latest phone launches, price drops, and tech updates in Bangladesh
        </p>
      </div>

      {/* Lead story */}
      {lead && <NewsCard article={lead} variant="lead" />}

      {/* Rest of the feed */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((article) => (
          <NewsCard key={article.slug} article={article} />
        ))}
      </div>
    </div>
  );
}
