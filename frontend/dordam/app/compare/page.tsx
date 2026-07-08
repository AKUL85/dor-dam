import type { Metadata } from "next";
import { fetchCompare } from "@/lib/api";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Phones",
  description: "Compare phone specifications side-by-side. Add up to 3 phones and see how they stack up against each other.",
};

interface Props {
  searchParams: Promise<{ slugs?: string }>;
}

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams;
  const slugs = sp.slugs
    ? sp.slugs.split(",").filter(Boolean).slice(0, 3)
    : [];

  const phones = slugs.length > 0
    ? await fetchCompare(slugs).catch(() => [])
    : [];

  return <CompareClient initialPhones={phones} initialSlugs={slugs} />;
}
