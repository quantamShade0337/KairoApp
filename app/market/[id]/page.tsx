"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { requestJson } from "@/lib/http-client";
import type { PublicApp, PublicProject, PublicUser } from "@/lib/backend/types";

type AppResponse = {
  app: PublicApp;
  project: PublicProject | null;
  creator: PublicUser | null;
  viewer: {
    saved: boolean;
    isOwner: boolean;
    purchased: boolean;
  };
};

function formatPrice(priceCents: number) {
  if (priceCents <= 0) {
    return "Free";
  }

  return `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
}

const PREVIEW_BY_NAME: Record<string, React.ReactNode> = {
  "Markdown Editor": (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      <div className="flex gap-4 h-80">
        <textarea
          defaultValue={"# Markdown Editor\n\nType **bold**, _italic_, or `code`.\n\n- List item one\n- List item two\n\n> Blockquote text here"}
          className="flex-1 border border-[#eaeaea] rounded-lg p-4 text-sm font-mono text-black resize-none outline-none focus:border-black transition-colors duration-150"
        />
        <div className="flex-1 border border-[#eaeaea] rounded-lg p-4 text-sm text-black leading-relaxed overflow-auto">
          <h1 className="text-lg font-semibold mb-3">Markdown Editor</h1>
          <p>Type <strong>bold</strong>, <em>italic</em>, or <code className="bg-[#f5f5f5] px-1 rounded text-[12px] font-mono">code</code>.</p>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-sm"><li>List item one</li><li>List item two</li></ul>
          <blockquote className="border-l-2 border-[#eaeaea] pl-3 mt-2 text-[#666] italic">Blockquote text here</blockquote>
        </div>
      </div>
    </div>
  ),
  "JSON Formatter": (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
      <textarea
        defaultValue={'{\n  "user": {\n    "name": "Alex Chen",\n    "role": "admin"\n  },\n  "active": true\n}'}
        className="border border-[#eaeaea] rounded-lg p-4 text-sm font-mono text-black h-52 resize-none outline-none focus:border-black transition-colors duration-150"
      />
      <div className="flex gap-2">
        <span className="text-xs px-3 py-1.5 border border-[#eaeaea] rounded-md text-[#666]">Format</span>
        <span className="text-xs px-3 py-1.5 border border-[#eaeaea] rounded-md text-[#666]">Minify</span>
        <span className="text-xs px-3 py-1.5 border border-[#eaeaea] rounded-md text-[#666]">Validate</span>
        <span className="ml-auto text-xs text-[#10B981] font-mono self-center">Valid JSON</span>
      </div>
    </div>
  ),
};

export default function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<AppResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingApp, setUsingApp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    requestJson<AppResponse>(`/api/apps/${id}`)
      .then((payload) => {
        if (active) {
          setData(payload);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load app.");
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
  }, [id]);

  const app = data?.app ?? null;
  const creator = data?.creator ?? null;
  const viewerSaved = data?.viewer.saved ?? false;
  const viewerPurchased = data?.viewer.purchased ?? false;
  const preview = useMemo(() => {
    if (!app) {
      return null;
    }
    return PREVIEW_BY_NAME[app.name] ?? null;
  }, [app]);

  async function handleSave() {
    if (!app || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = await requestJson<{ saved: boolean; saves: number }>(`/api/apps/${app.id}/save`, {
        method: "POST",
      });

      setData((current) =>
        current
          ? {
              ...current,
              app: {
                ...current.app,
                saves: payload.saves,
              },
              viewer: {
                ...current.viewer,
                saved: payload.saved,
              },
            }
          : current,
      );
      setNotice(payload.saved ? "Saved to your account." : "Removed from your saved apps.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to save app.";
      if (message.toLowerCase().includes("sign in")) {
        router.push(
          `/onboarding?mode=signin&redirectTo=${encodeURIComponent(`/market/${app.id}`)}&reason=${encodeURIComponent(
            "Sign in to save apps and keep track of what you want to revisit.",
          )}`,
        );
        return;
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClone() {
    if (!app || cloning) {
      return;
    }

    setCloning(true);
    setError(null);
    try {
      const payload = await requestJson<{ project: PublicProject; clones: number }>(`/api/apps/${app.id}/clone`, {
        method: "POST",
      });

      setData((current) =>
        current
          ? {
              ...current,
              app: {
                ...current.app,
                clones: payload.clones,
              },
            }
          : current,
      );

      setNotice("Clone created. Opening it in the builder now.");
      router.push(`/builder/${payload.project.id}`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to clone app.";
      if (message.toLowerCase().includes("sign in")) {
        router.push(
          `/onboarding?mode=signin&redirectTo=${encodeURIComponent(`/market/${app.id}`)}&reason=${encodeURIComponent(
            "Sign in to clone this app into your own workspace.",
          )}`,
        );
        return;
      }
      setError(message);
    } finally {
      setCloning(false);
    }
  }

  async function handleBuyAndClone() {
    if (!app || buying) {
      return;
    }

    if (app.priceCents <= 0 || viewerPurchased || data?.viewer.isOwner) {
      await handleClone();
      return;
    }

    setBuying(true);
    setError(null);
    try {
      const purchase = await requestJson<{ purchased: boolean }>(`/api/apps/${app.id}/purchase`, {
        method: "POST",
      });

      if (!purchase.purchased) {
        throw new Error("Unable to complete purchase.");
      }

      setData((current) =>
        current
          ? {
              ...current,
              viewer: {
                ...current.viewer,
                purchased: true,
              },
            }
          : current,
      );
      setNotice("Purchase complete. Creating your clone now.");
      await handleClone();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to buy app.";
      if (message.toLowerCase().includes("sign in")) {
        router.push(
          `/onboarding?mode=signin&redirectTo=${encodeURIComponent(`/market/${app.id}`)}&reason=${encodeURIComponent(
            "Sign in to buy and clone marketplace apps.",
          )}`,
        );
        return;
      }
      setError(message);
    } finally {
      setBuying(false);
    }
  }

  async function handleUse() {
    if (!app) {
      return;
    }

    setError(null);
    try {
      const payload = await requestJson<{ uses: number }>(`/api/apps/${app.id}/use`, {
        method: "POST",
      });

      setData((current) =>
        current
          ? {
              ...current,
              app: {
                ...current.app,
                uses: payload.uses,
              },
            }
          : current,
      );
      setNotice("App opened.");
      setUsingApp(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to launch app.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Navbar />
        <main className="flex-1 pt-14 px-6 py-10">
          <div className="max-w-[1200px] mx-auto">
            <div className="skeleton h-4 w-32 rounded mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
              <div className="border border-[#eaeaea] rounded-xl h-[420px] skeleton" />
              <div className="space-y-4">
                <div className="skeleton h-5 w-20 rounded" />
                <div className="skeleton h-12 w-full rounded" />
                <div className="skeleton h-24 w-full rounded" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-sm font-medium text-black">{error ?? "App not found"}</p>
          <Link href="/market" className="text-xs text-[#666] hover:text-black transition-colors duration-150">
            ← Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 pt-14">
        <div className="border-b border-[#eaeaea] px-6">
          <div className="max-w-[1200px] mx-auto py-3 flex items-center gap-2 text-xs text-[#666]">
            <Link href="/market" className="hover:text-black transition-colors duration-150">Explore</Link>
            <span className="text-[#eaeaea]">/</span>
            <span className="text-black">{app.name}</span>
          </div>
        </div>

        {!usingApp ? (
          <div className="max-w-[1200px] mx-auto px-6 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
              <div>
                <div className="border border-[#eaeaea] rounded-xl overflow-hidden">
                  <div className="border-b border-[#eaeaea] px-4 py-3 flex items-center gap-2 bg-[#fafafa]">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#eaeaea]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#eaeaea]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#eaeaea]" />
                    </div>
                    <span className="text-xs text-[#666] font-mono ml-2">{app.name}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      <span className="text-[11px] text-[#666] font-mono">live</span>
                    </div>
                  </div>
                  <div className="min-h-[380px] p-6 bg-white flex items-start justify-start">
                    {preview ?? (
                      <div className="w-full flex flex-col items-center justify-center min-h-[280px] gap-4">
                        <div className="w-12 h-12 border border-[#eaeaea] rounded-xl flex items-center justify-center">
                          <span className="text-lg font-semibold text-black">{app.name.charAt(0)}</span>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-black mb-1">{app.name}</p>
                          <p className="text-xs text-[#666] max-w-xs">{app.description}</p>
                        </div>
                        <button
                          onClick={() => void handleUse()}
                          className="text-sm bg-black text-white px-6 py-2 rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
                        >
                          Open app
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span className="text-xs font-mono text-black border border-black px-2.5 py-1 rounded-full bg-[#fafafa]">
                    {formatPrice(app.priceCents)}
                  </span>
                  {app.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/market?q=${tag}`}
                      className="text-xs font-mono text-[#666] border border-[#eaeaea] px-2.5 py-1 rounded-full hover:border-black hover:text-black transition-colors duration-150"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-2">{app.category}</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-black mb-3 leading-tight">{app.name}</h1>
                  <p className="text-sm text-[#666] leading-relaxed">{app.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-[#666]">
                    <span className="font-mono border border-[#eaeaea] rounded-full px-2.5 py-1">
                      {app.priceCents > 0 ? `Price ${formatPrice(app.priceCents)}` : "Free to clone"}
                    </span>
                    {viewerPurchased && <span className="font-mono text-[#10B981]">Purchased</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => void handleUse()}
                    className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
                  >
                    Use app
                  </button>
                  <button
                    onClick={() => void handleBuyAndClone()}
                    className="w-full py-2.5 text-sm font-medium rounded-md border transition-colors duration-150 border-[#eaeaea] text-black hover:border-black"
                  >
                    {buying || cloning
                      ? "Processing..."
                      : app.priceCents > 0 && !viewerPurchased && !data?.viewer.isOwner
                        ? `Buy & clone ${formatPrice(app.priceCents)}`
                        : "Clone"}
                  </button>
                  <button
                    onClick={() => void handleSave()}
                    className={`w-full py-2.5 text-sm font-medium rounded-md border transition-colors duration-150 ${
                      viewerSaved ? "border-black text-black" : "border-[#eaeaea] text-[#666] hover:border-black hover:text-black"
                    }`}
                  >
                    {saving ? "Saving..." : viewerSaved ? "Saved" : "Save"}
                  </button>
                </div>

                {notice && !error && <p className="text-sm text-[#10B981]">{notice}</p>}
                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="pt-4 border-t border-[#eaeaea]">
                  <p className="text-xs text-[#666] mb-2">Creator</p>
                  {creator ? (
                    <Link href={`/profile/${creator.handle}`} className="flex items-center gap-2.5 group w-fit">
                      <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {creator.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-black group-hover:text-[#4F46E5] transition-colors duration-150">
                        {creator.name}
                      </span>
                    </Link>
                  ) : (
                    <p className="text-sm text-[#666]">Unknown creator</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#eaeaea]">
                  {[
                    { label: "Uses", value: app.uses.toLocaleString() },
                    { label: "Clones", value: app.clones },
                    { label: "Since", value: new Date(app.createdAt).getFullYear() },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-[11px] text-[#666] mb-1">{stat.label}</p>
                      <p className="text-sm font-semibold text-black font-mono">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-57px)]">
            <div className="border-b border-[#eaeaea] px-6 py-2.5 flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span className="text-xs font-mono text-[#666]">{app.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleBuyAndClone()}
                  className="text-xs px-3 py-1.5 border border-[#eaeaea] rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
                >
                  {buying || cloning
                    ? "Working..."
                    : app.priceCents > 0 && !viewerPurchased && !data?.viewer.isOwner
                      ? `Buy & clone ${formatPrice(app.priceCents)}`
                      : "Clone"}
                </button>
                <button
                  onClick={() => setUsingApp(false)}
                  className="text-xs px-3 py-1.5 border border-[#eaeaea] rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
                >
                  ← Back
                </button>
              </div>
            </div>
            <div className="flex-1 p-8 overflow-auto">
              {preview ?? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-12 h-12 border border-[#eaeaea] rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold text-black">{app.name.charAt(0)}</span>
                  </div>
                  <p className="text-sm font-medium text-black">{app.name}</p>
                  <p className="text-xs text-[#666] max-w-xs text-center">{app.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      {!usingApp && <Footer />}
    </div>
  );
}
