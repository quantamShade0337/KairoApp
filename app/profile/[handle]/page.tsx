"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AppCard from "@/components/ui/AppCard";
import { requestJson } from "@/lib/http-client";
import type { PublicApp, PublicUser } from "@/lib/backend/types";

type ProfileResponse = {
  creator: PublicUser & {
    appCount: number;
    totalUses: number;
  };
  apps: PublicApp[];
};

export default function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    requestJson<ProfileResponse>(`/api/creators/${handle}`)
      .then((payload) => {
        if (active) {
          setData(payload);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load creator.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [handle]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 pt-20 pb-24 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="py-12 border-b border-[#eaeaea] mb-12">
              <div className="skeleton h-14 w-14 rounded-full mb-4" />
              <div className="skeleton h-8 w-48 rounded mb-2" />
              <div className="skeleton h-4 w-24 rounded mb-4" />
              <div className="skeleton h-10 w-96 rounded" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-medium text-black">{error ?? "Creator not found"}</p>
        <Link href="/market" className="text-xs text-[#666] hover:text-black transition-colors duration-150">Back to Explore</Link>
      </div>
    );
  }

  const { creator, apps } = data;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="py-12 border-b border-[#eaeaea] mb-12">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-white text-xl font-semibold shrink-0">
                {creator.name.charAt(0)}
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-black">{creator.name}</h1>
                <p className="text-xs font-mono text-[#666]">@{creator.handle}</p>
                <p className="text-sm text-[#666] mt-2 max-w-md">{creator.bio}</p>
                <div className="flex gap-6 mt-4">
                  <span className="text-xs text-[#666] font-mono"><span className="text-black font-semibold">{creator.appCount}</span> apps</span>
                  <span className="text-xs text-[#666] font-mono"><span className="text-black font-semibold">{creator.totalUses.toLocaleString()}</span> total uses</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-8">Apps by {creator.name}</p>
            {apps.length === 0 ? (
              <div className="py-20 text-center border border-[#eaeaea] rounded-lg">
                <p className="text-sm font-medium text-black mb-2">No apps yet</p>
                <p className="text-xs text-[#666]">This creator hasn&apos;t published anything yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {apps.map((app) => (
                  <AppCard key={app.id} app={app} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
