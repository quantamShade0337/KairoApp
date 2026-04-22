import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LandingClient from "@/components/LandingClient";
import { getHomeFeed } from "@/lib/backend/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const feed = await getHomeFeed();
  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      <LandingClient apps={feed.apps} creators={feed.creators} />
      <Footer />
    </div>
  );
}
