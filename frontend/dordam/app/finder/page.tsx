import type { Metadata } from "next";
import { fetchBrands } from "@/lib/api";
import FinderClient from "./FinderClient";

export const metadata: Metadata = {
  title: "Phone Finder",
  description: "Find the perfect phone using advanced filters. Search by brand, RAM, storage, battery capacity, camera resolution, and more.",
};

export default async function FinderPage() {
  const brands = await fetchBrands().catch(() => []);

  return <FinderClient brands={brands} />;
}
