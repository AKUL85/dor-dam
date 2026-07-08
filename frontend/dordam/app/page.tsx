import { fetchPhones } from "@/lib/api";
import NewsGrid from "@/components/NewsGrid";
import PopularDevices from "@/components/PopularDevices";
import CommunityFeed from "@/components/CommunityFeed";

export default async function Home() {
  let popularResult: Awaited<ReturnType<typeof fetchPhones>> = { total: 0, page: 1, pageSize: 20, totalPages: 0, sort: "popularity", items: [] };

  try {
    popularResult = await fetchPhones({ sort: "popularity", pageSize: 20 });
  } catch {
    // API unavailable — render with empty data
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Featured News & Articles */}
      <NewsGrid />

      {/* Popular Devices */}
      <PopularDevices phones={popularResult.items} />

      {/* Community Feed */}
      <CommunityFeed />
    </div>
  );
}
