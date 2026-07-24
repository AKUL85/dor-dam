import type { Metadata } from "next";
import FinderClient from "./FinderClient";

export const metadata: Metadata = {
  title: "Phone Finder — DorDam",
  description:
    "Find your next phone with the most detailed spec-based search. Filter by network, launch, body, display, platform, memory, camera, battery, price.",
};

export default function FinderPage() {
  return <FinderClient />;
}
