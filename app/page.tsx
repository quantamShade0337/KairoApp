import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AppCard from "@/components/ui/AppCard";
import { getHomeFeed } from "@/lib/backend/service";

export const dynamic = "force-dynamic";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Shape the app",
    body: "Describe the product in plain language, choose a model, and connect your own API key.",
  },
  {
    step: "02",
    title: "Refine the behavior",
    body: "Tune the opening message, add context, and set guardrails before you save the draft.",
  },
  {
    step: "03",
    title: "Publish",
    body: "Launch privately or publicly so others can use it, clone it, and keep the loop moving.",
  },
];

const PRICING_PREVIEW = [
  {
    tier: "Free",
    price: "$0",
    detail: "Prototype with your own OpenAI or Claude key.",
  },
  {
    tier: "Pro",
    price: "$24/mo",
    detail: "Unlimited drafts, better publishing flow, version history.",
  },
  {
    tier: "Studio",
    price: "$99/mo",
    detail: "Shared workspaces and collaboration for teams shipping AI apps.",
  },
];

export default async function HomePage() {
  const feed = await getHomeFeed();
  const tickerItems = [...feed.apps, ...feed.apps];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      <section className="relative pt-36 pb-28 px-6 overflow-hidden border-b border-[#eaeaea]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #e0e0e0 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto">
          <div className="max-w-4xl">
            <h1 className="text-[clamp(3rem,7vw,6rem)] font-semibold leading-[1.0] tracking-[-0.03em] text-black mb-7">
              Build apps.
              <br />
              Together.
              <br />
              <span className="text-[#666]">Use them instantly.</span>
            </h1>
            <p className="text-base text-[#666] max-w-lg leading-relaxed mb-10">
              Kyro is an AI app builder where you design the behavior first, plug in your OpenAI or Claude key, and ship something usable without wrestling a code scaffold.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/market"
                className="inline-flex items-center justify-center text-sm font-medium px-6 py-2.5 rounded-md border border-[#eaeaea] text-black hover:border-black transition-colors duration-150"
              >
                Explore apps
              </Link>
              <Link
                href="/onboarding?mode=signup"
                className="inline-flex items-center justify-center text-sm font-medium px-6 py-2.5 rounded-md bg-black text-white hover:bg-[#4F46E5] transition-colors duration-150"
              >
                Start building
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-0 border-b border-[#eaeaea] overflow-hidden relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none z-10"
          style={{ background: "linear-gradient(to right, white, transparent)" }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none z-10"
          style={{ background: "linear-gradient(to left, white, transparent)" }}
        />
        <div className="flex marquee-track">
          {tickerItems.map((app, index) => (
            <Link
              key={`${app.id}-${index}`}
              href={`/market/${app.id}`}
              className="shrink-0 flex items-center gap-3 px-6 py-4 border-r border-[#eaeaea] hover:bg-[#fafafa] transition-colors duration-150 group"
              style={{ minWidth: "220px" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#eaeaea] group-hover:bg-black transition-colors duration-150 shrink-0" />
              <div>
                <p className="text-sm font-medium text-black leading-none">{app.name}</p>
                <p className="text-[11px] text-[#666] font-mono mt-1">{app.uses.toLocaleString()} uses</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-24 px-6 bg-[#fafafa] border-b border-[#eaeaea]">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-14">
            <p className="text-xs text-[#666] font-mono uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-2xl font-semibold tracking-tight text-black">The loop</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#eaeaea] rounded-xl overflow-hidden">
            {HOW_IT_WORKS.map((item, index) => (
              <div
                key={item.step}
                className={`p-8 flex flex-col gap-4 bg-white ${
                  index > 0 ? "border-t md:border-t-0 md:border-l border-[#eaeaea]" : ""
                }`}
              >
                <span className="text-xs font-mono text-[#666]">{item.step}</span>
                <h3 className="text-lg font-semibold text-black tracking-tight">{item.title}</h3>
                <p className="text-sm text-[#666] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-b border-[#eaeaea] bg-[#fafafa]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-end justify-between gap-6 mb-10 flex-wrap">
            <div className="max-w-2xl">
              <p className="text-xs text-[#666] font-mono uppercase tracking-widest mb-3">Pricing</p>
              <h2 className="text-2xl font-semibold tracking-tight text-black">Bring your own model key. Start free.</h2>
              <p className="mt-3 text-sm text-[#666] leading-relaxed">
                Start free with your own API key, then upgrade when you need more drafts, better publishing, and a tighter collaboration workflow.
              </p>
            </div>
            <Link
              href="/pricing"
              className="text-sm text-[#666] hover:text-black transition-colors duration-150 shrink-0"
            >
              View full pricing →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING_PREVIEW.map((item) => (
              <div key={item.tier} className="rounded-xl border border-[#eaeaea] bg-white p-5 hover:border-black transition-colors duration-150">
                <div className="flex items-end justify-between gap-4 mb-4 pb-4 border-b border-[#eaeaea]">
                  <p className="text-sm font-semibold text-black">{item.tier}</p>
                  <p className="text-sm font-mono text-black">{item.price}</p>
                </div>
                <p className="text-sm text-[#666] leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-b border-[#eaeaea]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs text-[#666] font-mono uppercase tracking-widest mb-3">Apps</p>
              <h2 className="text-2xl font-semibold tracking-tight text-black">Built by the community</h2>
            </div>
            <Link
              href="/market"
              className="text-sm text-[#666] hover:text-black transition-colors duration-150 hidden md:block"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {feed.apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
          <div className="mt-6 md:hidden">
            <Link href="/market" className="text-sm text-[#666] hover:text-black transition-colors duration-150">
              View all →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#fafafa] border-b border-[#eaeaea]">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <p className="text-xs text-[#666] font-mono uppercase tracking-widest mb-3">Creators</p>
            <h2 className="text-2xl font-semibold tracking-tight text-black">People building on Kyro</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {feed.creators.map((creator) => (
              <Link
                key={creator.id}
                href={`/profile/${creator.handle}`}
                className="border border-[#eaeaea] rounded-lg p-5 bg-white hover:border-black transition-colors duration-150 flex flex-col gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {creator.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black group-hover:text-[#4F46E5] transition-colors duration-150 leading-none">
                      {creator.name}
                    </p>
                    <p className="text-[11px] text-[#666] font-mono mt-1">@{creator.handle}</p>
                  </div>
                </div>
                <p className="text-xs text-[#666] leading-relaxed line-clamp-2">{creator.bio}</p>
                <div className="flex gap-4 pt-3 mt-auto border-t border-[#eaeaea]">
                  <span className="text-[11px] text-[#666] font-mono">{creator.appCount} apps</span>
                  <span className="text-[11px] text-[#666] font-mono">{creator.totalUses.toLocaleString()} uses</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-36 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #e0e0e0 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 60% 70% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 50%, black 30%, transparent 100%)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto text-center">
          <p className="text-xs text-[#666] font-mono uppercase tracking-widest mb-5">Ready?</p>
          <h2 className="text-[clamp(2.2rem,5vw,4.5rem)] font-semibold tracking-[-0.03em] text-black mb-5 leading-[1.05]">
            Ship something useful.
            <br />
            <span className="text-[#666]">Today.</span>
          </h2>
          <p className="text-sm text-[#666] mb-10 max-w-xs mx-auto leading-relaxed">
            Join creators shipping small tools that people actually use every day.
          </p>
          <div className="flex items-center gap-3 justify-center flex-wrap">
            <Link
              href="/onboarding?mode=signup"
              className="inline-flex items-center justify-center text-sm font-medium px-8 py-3 rounded-md bg-black text-white hover:bg-[#4F46E5] transition-colors duration-150"
            >
              Get started free
            </Link>
            <Link
              href="/market"
              className="inline-flex items-center justify-center text-sm font-medium px-8 py-3 rounded-md border border-[#eaeaea] text-black hover:border-black transition-colors duration-150"
            >
              Browse apps
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
