"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AppCard, { AppCardSkeleton } from "@/components/ui/AppCard";
import { requestJson } from "@/lib/http-client";
import type { PublicApp } from "@/lib/backend/types";

const CATEGORIES = ["All", "Tools", "AI", "Dev", "Productivity"] as const;
type Category = (typeof CATEGORIES)[number];

const SORT_OPTIONS = ["Most used", "Most cloned", "Newest"] as const;
type Sort = (typeof SORT_OPTIONS)[number];

type AppsResponse = {
  apps: PublicApp[];
};

export default function MarketClientPage({ initialQuery }: { initialQuery: string }) {
  const [apps, setApps] = useState<PublicApp[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Category>("All");
  const [sort, setSort] = useState<Sort>("Most used");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    requestJson<AppsResponse>("/api/apps")
      .then((payload) => {
        if (active) {
          setApps(payload.apps);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load apps.");
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
  }, []);

  const categoryCounts = useMemo(
    () =>
      CATEGORIES.reduce(
        (acc, item) => {
          acc[item] = item === "All" ? apps.length : apps.filter((app) => app.category === item).length;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [apps],
  );

  const filtered = useMemo(() => {
    return apps
      .filter((app) => {
        const matchCat = category === "All" || app.category === category;
        const normalizedQuery = query.trim().toLowerCase();
        const matchQuery =
          normalizedQuery === "" ||
          app.name.toLowerCase().includes(normalizedQuery) ||
          app.description.toLowerCase().includes(normalizedQuery) ||
          app.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
          app.creator.toLowerCase().includes(normalizedQuery);
        return matchCat && matchQuery;
      })
      .sort((left, right) => {
        if (sort === "Most cloned") {
          return right.clones - left.clones;
        }
        if (sort === "Newest") {
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }
        return right.uses - left.uses;
      });
  }, [apps, category, query, sort]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 pt-14 pb-24">
        <div className="border-b border-[#eaeaea] bg-[#fafafa] px-6">
          <div className="max-w-[1200px] mx-auto py-10">
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Explore</p>
            <h1 className="text-3xl font-semibold tracking-tight text-black mb-6">{filtered.length} apps</h1>

            <div className="relative max-w-lg">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
              >
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search apps, creators, tags..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full border border-[#eaeaea] bg-white rounded-lg pl-10 pr-4 py-2.5 text-sm text-black placeholder:text-[#666] outline-none focus:border-black transition-colors duration-150"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-black transition-colors duration-150 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between gap-4 py-5 border-b border-[#eaeaea] flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors duration-150 flex items-center gap-1.5 ${
                    category === item
                      ? "bg-black text-white border-black"
                      : "bg-white text-[#666] border-[#eaeaea] hover:border-black hover:text-black"
                  }`}
                >
                  {item}
                  <span className={`font-mono text-[10px] ${category === item ? "text-white/60" : "text-[#999]"}`}>
                    {categoryCounts[item]}
                  </span>
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="text-xs border border-[#eaeaea] rounded-lg px-3 py-1.5 text-[#666] outline-none focus:border-black transition-colors duration-150 bg-white cursor-pointer hover:border-black"
            >
              {SORT_OPTIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="py-8">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, index) => <AppCardSkeleton key={index} />)}
              </div>
            ) : error ? (
              <div className="py-24 text-center border border-dashed border-[#eaeaea] rounded-xl">
                <p className="text-sm font-medium text-black mb-2">Can&apos;t load apps right now</p>
                <p className="text-xs text-[#666] mb-5">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-[#eaeaea] rounded-xl">
                <p className="text-sm font-medium text-black mb-2">No apps found</p>
                <p className="text-xs text-[#666] mb-5">
                  {query ? `No results for "${query}"` : "Nothing in this category yet."}
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                  className="text-xs border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((app) => <AppCard key={app.id} app={app} />)}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
