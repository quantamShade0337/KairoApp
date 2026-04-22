"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PublicApp, PublicUser } from "@/lib/backend/types";

// ─── Intersection observer hook ───────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0px)" : "translateY(28px)",
      transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ─── Typewriter ────────────────────────────────────────────────────────────────

const WORDS = ["support copilot", "sales assistant", "recruiting bot", "research agent", "writing helper", "customer tool"];

function Typewriter() {
  const [wi, setWi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);
  const [pause, setPause] = useState(false);
  useEffect(() => {
    if (pause) { const t = setTimeout(() => setPause(false), 2000); return () => clearTimeout(t); }
    const word = WORDS[wi];
    const t = setTimeout(() => {
      if (!del) {
        if (ci < word.length) setCi(c => c + 1);
        else { setPause(true); setDel(true); }
      } else {
        if (ci > 0) setCi(c => c - 1);
        else { setDel(false); setWi(i => (i + 1) % WORDS.length); }
      }
    }, del ? 35 : 75);
    return () => clearTimeout(t);
  }, [ci, del, pause, wi]);
  return (
    <span className="text-[#4F46E5]">
      {WORDS[wi].slice(0, ci)}
      <span style={{ display: "inline-block", width: 2, height: "0.85em", background: "#4F46E5", verticalAlign: "middle", marginLeft: 1, animation: "blink 1s step-end infinite" }} />
    </span>
  );
}

// ─── Animated counter ──────────────────────────────────────────────────────────

function Count({ n, suffix = "" }: { n: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let frame = 0; const total = 50;
    const id = setInterval(() => { frame++; setV(Math.round((n * frame) / total)); if (frame >= total) clearInterval(id); }, 1200 / total);
    return () => clearInterval(id);
  }, [visible, n]);
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
}

// ─── Interactive builder demo ──────────────────────────────────────────────────

const DEMO_STEPS = [
  {
    label: "01 Name it",
    content: (
      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-[#999] font-mono mb-1.5 uppercase tracking-widest">App name</p>
          <div className="border border-[#4F46E5]/40 rounded-lg px-3 py-2.5 bg-white text-sm font-semibold text-black flex items-center justify-between">
            Support Copilot Pro
            <span className="w-0.5 h-4 bg-[#4F46E5] rounded" style={{ animation: "blink 1s step-end infinite" }} />
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#999] font-mono mb-1.5 uppercase tracking-widest">What it does</p>
          <div className="border border-[#eaeaea] rounded-lg px-3 py-2.5 bg-[#fafafa] text-sm text-[#555] leading-relaxed">
            Answers support questions from our docs and escalates billing issues automatically.
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "02 Configure",
    content: (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[{ k: "Model", v: "GPT-5.1", hi: true }, { k: "Voice", v: "Friendly" }, { k: "Provider", v: "OpenAI" }, { k: "Surface", v: "Chat" }].map(item => (
            <div key={item.k} className={`rounded-lg border px-3 py-2.5 ${item.hi ? "border-[#4F46E5]/40 bg-[#f8f8ff]" : "border-[#eaeaea] bg-[#fafafa]"}`}>
              <p className="text-[10px] text-[#999] font-mono">{item.k}</p>
              <p className="text-sm font-semibold text-black">{item.v}</p>
            </div>
          ))}
        </div>
        <div className="border border-[#eaeaea] rounded-lg px-3 py-2.5 bg-[#fafafa]">
          <p className="text-[10px] text-[#999] font-mono mb-1">Guardrails</p>
          <p className="text-xs text-[#666] leading-relaxed">Do not fabricate. Escalate billing issues. Stay on-topic.</p>
        </div>
      </div>
    ),
  },
  {
    label: "03 Preview",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg border border-[#eaeaea] bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-[#eaeaea] flex items-center justify-between bg-[#fafafa]">
            <p className="text-xs font-semibold text-black">Support Copilot Pro</p>
            <span className="text-[10px] font-mono text-[#10B981] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />Live
            </span>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-start">
              <div className="bg-[#fafafa] border border-[#eaeaea] rounded-2xl rounded-tl-sm px-3 py-2 text-[11px] text-[#555] max-w-[85%] leading-relaxed">Hi! I'm your support assistant. How can I help?</div>
            </div>
            <div className="flex justify-end">
              <div className="bg-black rounded-2xl rounded-tr-sm px-3 py-2 text-[11px] text-white max-w-[85%]">How do I upgrade my plan?</div>
            </div>
            <div className="flex justify-start">
              <div className="bg-[#fafafa] border border-[#eaeaea] rounded-2xl rounded-tl-sm px-3 py-2 text-[11px] text-[#555] max-w-[85%] leading-relaxed">Head to Settings → Billing → Upgrade. Anything else?</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black rounded-lg py-2.5 text-xs text-white font-medium text-center">Publish</div>
          <div className="border border-[#eaeaea] rounded-lg py-2.5 text-xs text-[#666] text-center">Save draft</div>
        </div>
      </div>
    ),
  },
];

function BuilderDemo() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % DEMO_STEPS.length), 3800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-2xl border border-[#eaeaea] bg-white overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
      <div className="flex border-b border-[#eaeaea]">
        {DEMO_STEPS.map((s, i) => (
          <button key={s.label} type="button" onClick={() => setActive(i)}
            className={`flex-1 px-3 py-3 text-[11px] font-mono transition-all duration-200 whitespace-nowrap ${active === i ? "bg-black text-white" : "text-[#999] hover:text-black hover:bg-[#fafafa]"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="p-5">
        <div key={active} style={{ animation: "fadeSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both" }}>
          {DEMO_STEPS[active].content}
        </div>
      </div>
      <div className="flex justify-center gap-1.5 pb-4">
        {DEMO_STEPS.map((_, i) => (
          <button key={i} type="button" onClick={() => setActive(i)}
            className={`h-1 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-black" : "w-1.5 bg-[#ddd]"}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Quotes ────────────────────────────────────────────────────────────────────

const QUOTES = [
  { text: "Shipped our internal knowledge base tool in an afternoon. The team loves it.", author: "Priya M.", role: "Founder" },
  { text: "Finally a builder that doesn't make you think about infra. Just describe and ship.", author: "James K.", role: "Product Lead" },
  { text: "Cloned a marketplace app, tweaked the prompt, had something useful in 20 minutes.", author: "Aiko T.", role: "Solo builder" },
];

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "◈", title: "Prompt-first", body: "Describe behavior in plain language. No config files, no YAML, no infra decisions." },
  { icon: "⌁", title: "Bring your key", body: "Plug in your OpenAI or Claude key. Your usage, your costs, your data — always." },
  { icon: "⊡", title: "Live preview", body: "Click any UI element in the preview and annotate directly. Changes stay scoped to your notes." },
  { icon: "⤴", title: "One-click publish", body: "Go private for your team or public on the marketplace. No deploys, no DNS, nothing." },
  { icon: "⊕", title: "Clone & remix", body: "Fork any public app. Build on what already works instead of starting from zero." },
  { icon: "⊘", title: "Guardrails built in", body: "Add knowledge context and constraints before you ship so behavior never drifts." },
];

// ─── Pricing ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Free", price: "$0", cadence: "forever",
    pitch: "Prototype with your own API key.", hi: false,
    features: ["Unlimited drafts", "Your API key", "Private publishing", "Basic analytics"],
    cta: "Start free", href: "/onboarding?mode=signup",
  },
  {
    name: "Pro", price: "$24", cadence: "/mo",
    pitch: "For builders shipping seriously.", hi: true,
    features: ["Everything in Free", "Version history", "Public marketplace listing", "Better publishing flow", "Priority support"],
    cta: "Get Pro", href: "/onboarding?mode=signup&plan=pro",
  },
  {
    name: "Studio", price: "$99", cadence: "/mo",
    pitch: "Teams building AI tools together.", hi: false,
    features: ["Everything in Pro", "Shared workspaces", "Team collaboration", "Usage dashboard", "Custom branding"],
    cta: "Try Studio", href: "/onboarding?mode=signup&plan=studio",
  },
];

// ─── App mini card ─────────────────────────────────────────────────────────────

function MiniAppCard({ app }: { app: PublicApp }) {
  return (
    <Link href={`/market/${app.id}`}
      className="group flex flex-col gap-2.5 rounded-xl border border-[#eaeaea] bg-white p-4 hover:border-black hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-black leading-snug group-hover:text-[#4F46E5] transition-colors duration-150 line-clamp-1">{app.name}</h3>
        <span className="text-[10px] font-mono text-[#999] shrink-0 border border-[#eaeaea] rounded-full px-2 py-0.5 bg-[#fafafa]">{app.category}</span>
      </div>
      <p className="text-xs text-[#666] leading-relaxed line-clamp-2 flex-1">{app.description}</p>
      <div className="flex items-center justify-between pt-2.5 mt-auto border-t border-[#eaeaea]">
        <span className="text-xs text-[#999]">{app.creator}</span>
        <span className="text-[11px] text-[#bbb] font-mono">{app.uses.toLocaleString()} uses</span>
      </div>
    </Link>
  );
}

// ─── Props & main ─────────────────────────────────────────────────────────────

type Props = { apps: PublicApp[]; creators: PublicUser[] };

export default function LandingClient({ apps, creators }: Props) {
  const [mounted, setMounted] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 4500);
    return () => clearInterval(id);
  }, []);

  const ticker = [...apps, ...apps];
  const s = (i: number) => i * 55;

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden border-b border-[#eaeaea]">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, #c4c4c4 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 100%)",
        }} />

        <div className="relative max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_440px] gap-14 xl:gap-20 items-center">
          {/* Left */}
          <div>
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(-8px)", transition: "opacity 0.5s ease 80ms, transform 0.5s ease 80ms" }}>
              <span className="inline-flex items-center gap-2 border border-[#eaeaea] bg-white rounded-full px-3.5 py-1.5 text-[11px] font-mono text-[#666] mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" style={{ animation: "pulse-dot 2.5s ease-in-out infinite" }} />
                AI app builder · marketplace · bring your own key
              </span>
            </div>

            <h1 style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "none" : "translateY(22px)",
              transition: "opacity 0.65s cubic-bezier(0.16,1,0.3,1) 180ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) 180ms",
              fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)",
              fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.03em", color: "#000", marginBottom: "1.25rem",
            }}>
              Build your<br />own <Typewriter /><br />
              <span style={{ color: "#b0b0b0" }}>in minutes.</span>
            </h1>

            <p style={{
              opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(18px)",
              transition: "opacity 0.65s cubic-bezier(0.16,1,0.3,1) 300ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) 300ms",
              color: "#666", fontSize: "1rem", lineHeight: 1.7, maxWidth: "400px", marginBottom: "2rem",
            }}>
              Describe the behavior. Plug in your API key. Preview the result. Ship it. No code scaffold, no infra, no waiting.
            </p>

            <div style={{
              opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(14px)",
              transition: "opacity 0.65s cubic-bezier(0.16,1,0.3,1) 420ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) 420ms",
              display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", marginBottom: "2.5rem",
            }}>
              <Link href="/onboarding?mode=signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-[#4F46E5] transition-colors duration-150">
                Start building free
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5H10.5M10.5 6.5L7.5 3.5M10.5 6.5L7.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <Link href="/market" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#e0e0e0] text-black text-sm font-medium hover:border-black transition-colors duration-150">
                Browse marketplace
              </Link>
            </div>

            <div style={{
              opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 600ms",
              display: "flex", gap: "2rem", flexWrap: "wrap", paddingTop: "2rem", borderTop: "1px solid #eaeaea",
            }}>
              {[{ label: "Apps built", n: 240, suffix: "+" }, { label: "Creators", n: 80, suffix: "+" }, { label: "Total uses", n: 12400, suffix: "+" }].map(stat => (
                <div key={stat.label}>
                  <p className="text-2xl font-semibold text-black tracking-tight tabular-nums"><Count n={stat.n} suffix={stat.suffix} /></p>
                  <p className="text-[11px] text-[#aaa] font-mono mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — animated builder demo */}
          <div style={{
            opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(30px) scale(0.97)",
            transition: "opacity 0.75s cubic-bezier(0.16,1,0.3,1) 280ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) 280ms",
          }}>
            <BuilderDemo />
          </div>
        </div>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────────────────── */}
      {apps.length > 0 && (
        <div className="border-b border-[#eaeaea] py-4 overflow-hidden bg-[#fafafa]">
          <div className="flex overflow-hidden">
            <div className="flex gap-3 marquee-track" style={{ width: "max-content" }}>
              {ticker.map((app, i) => (
                <Link key={`${app.id}-${i}`} href={`/market/${app.id}`}
                  className="shrink-0 flex items-center gap-2 border border-[#eaeaea] bg-white rounded-lg px-3.5 py-2 hover:border-black transition-colors duration-150">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] shrink-0" />
                  <span className="text-xs font-medium text-black whitespace-nowrap">{app.name}</span>
                  <span className="text-[10px] text-[#ccc] font-mono whitespace-nowrap">{app.uses.toLocaleString()} uses</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WHAT IS KYRO ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-b border-[#eaeaea]">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp>
            <p className="text-[11px] font-mono text-[#aaa] uppercase tracking-widest mb-3">What is Kyro?</p>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold tracking-[-0.03em] text-black leading-[1.06] max-w-3xl mb-4">
              The simplest path from AI idea to working, shareable app.
            </h2>
            <p className="text-sm text-[#666] max-w-md leading-relaxed">
              Most builders make you manage infra. Kyro focuses on what matters: describe the behavior, configure the model, preview the result, ship it. That's the entire loop.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={s(i)}>
                <div className="border border-[#eaeaea] rounded-xl p-5 h-full hover:border-black hover:shadow-[0_2px_16px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-default group">
                  <span className="inline-block text-xl text-[#4F46E5] font-mono mb-3 group-hover:scale-110 transition-transform duration-200 origin-left">{f.icon}</span>
                  <h3 className="text-sm font-semibold text-black mb-1.5">{f.title}</h3>
                  <p className="text-sm text-[#666] leading-relaxed">{f.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-b border-[#eaeaea] bg-[#fafafa]">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp>
            <p className="text-[11px] font-mono text-[#aaa] uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold tracking-[-0.03em] text-black leading-[1.06] max-w-2xl mb-2">
              Three steps. One loop.
            </h2>
            <p className="text-sm text-[#666] max-w-sm leading-relaxed">No config, no deploys, no wrestling with infra.</p>
          </FadeUp>

          {/* Step 1 */}
          <FadeUp delay={40} className="mt-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
              <div>
                <span className="inline-block text-[11px] font-mono text-[#4F46E5] tracking-widest uppercase mb-3">01 — Name & describe</span>
                <h3 className="text-2xl font-semibold text-black tracking-tight mb-4 leading-snug">Give your app a name.<br/>Tell the AI what it does.</h3>
                <p className="text-sm text-[#666] leading-relaxed max-w-sm mb-5">Write the app name and describe its job in plain language. No templates. No schema. The builder turns your words into a structured brief the AI works from.</p>
                <Link href="/builder/new" className="inline-flex items-center gap-1.5 text-sm font-semibold text-black hover:text-[#4F46E5] transition-colors duration-150">Open the builder →</Link>
              </div>
              <div className="rounded-2xl border border-[#eaeaea] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <p className="text-[10px] font-mono text-[#aaa] uppercase tracking-widest mb-4">App identity</p>
                <div className="space-y-3">
                  <div className="rounded-lg border border-[#4F46E5]/25 bg-[#f8f8ff] px-4 py-3">
                    <p className="text-[10px] text-[#aaa] mb-1">Name</p>
                    <p className="text-sm font-semibold text-black">Support Copilot Pro</p>
                  </div>
                  <div className="rounded-lg border border-[#eaeaea] bg-[#fafafa] px-4 py-3">
                    <p className="text-[10px] text-[#aaa] mb-1">What it does</p>
                    <p className="text-sm text-black leading-relaxed">A support assistant that answers from our docs and escalates billing issues to the right team.</p>
                  </div>
                  <div className="rounded-lg border border-[#eaeaea] bg-[#fafafa] px-4 py-3">
                    <p className="text-[10px] text-[#aaa] mb-1">Who it helps</p>
                    <p className="text-sm text-black">Customers needing fast answers without waiting for a human agent.</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Connector */}
          <div className="flex justify-center my-8">
            <div className="w-px h-12 bg-gradient-to-b from-[#eaeaea] to-transparent" />
          </div>

          {/* Step 2 */}
          <FadeUp delay={40}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
              <div className="lg:order-2">
                <span className="inline-block text-[11px] font-mono text-[#4F46E5] tracking-widest uppercase mb-3">02 — Configure behavior</span>
                <h3 className="text-2xl font-semibold text-black tracking-tight mb-4 leading-snug">Choose the model.<br/>Set the tone. Add guardrails.</h3>
                <p className="text-sm text-[#666] leading-relaxed max-w-sm mb-5">Pick OpenAI or Claude, plug in your API key, define voice and surface type, and add knowledge context. Set what the app can and can't do.</p>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-[#aaa] font-mono">Works with</span>
                  <span className="text-xs font-semibold text-black border border-[#eaeaea] rounded-full px-3 py-1">OpenAI</span>
                  <span className="text-xs font-semibold text-black border border-[#eaeaea] rounded-full px-3 py-1">Claude</span>
                </div>
              </div>
              <div className="lg:order-1 rounded-2xl border border-[#eaeaea] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <p className="text-[10px] font-mono text-[#aaa] uppercase tracking-widest mb-4">AI configuration</p>
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  {[{ k: "Provider", v: "OpenAI" }, { k: "Model", v: "GPT-5.1" }, { k: "Voice", v: "Friendly" }, { k: "Surface", v: "Chat" }].map(item => (
                    <div key={item.k} className="rounded-lg border border-[#eaeaea] bg-[#fafafa] px-3 py-2.5">
                      <p className="text-[10px] text-[#aaa] font-mono">{item.k}</p>
                      <p className="text-sm font-semibold text-black">{item.v}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-[#eaeaea] bg-[#fafafa] px-3 py-2.5">
                    <p className="text-[10px] text-[#aaa] font-mono mb-1">Knowledge context</p>
                    <p className="text-xs text-[#666] leading-relaxed">Help center articles, pricing FAQ, escalation policy.</p>
                  </div>
                  <div className="rounded-lg border border-[#eaeaea] bg-[#fafafa] px-3 py-2.5">
                    <p className="text-[10px] text-[#aaa] font-mono mb-1">Guardrails</p>
                    <p className="text-xs text-[#666] leading-relaxed">Do not fabricate facts. Escalate billing to humans. Stay on-topic.</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

          <div className="flex justify-center my-8">
            <div className="w-px h-12 bg-gradient-to-b from-[#eaeaea] to-transparent" />
          </div>

          {/* Step 3 */}
          <FadeUp delay={40}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
              <div>
                <span className="inline-block text-[11px] font-mono text-[#4F46E5] tracking-widest uppercase mb-3">03 — Preview & ship</span>
                <h3 className="text-2xl font-semibold text-black tracking-tight mb-4 leading-snug">Click elements.<br/>Leave notes. Publish.</h3>
                <p className="text-sm text-[#666] leading-relaxed max-w-sm mb-5">The live preview shows exactly what users will see. Click any element to annotate it. When you're satisfied, publish privately for your team or publicly on the marketplace.</p>
                <Link href="/market" className="inline-flex items-center gap-1.5 text-sm font-semibold text-black hover:text-[#4F46E5] transition-colors duration-150">See live apps →</Link>
              </div>
              <div className="rounded-2xl border border-[#eaeaea] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-mono text-[#aaa] uppercase tracking-widest">Live preview</p>
                  <span className="text-[10px] font-mono text-[#10B981] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
                    Ready to ship
                  </span>
                </div>
                <div className="rounded-xl border border-[#eaeaea] overflow-hidden mb-3">
                  {[
                    { id: "Hero section", note: "Headline & intro", selected: true, n: 2 },
                    { id: "Prompt box", note: "User input area", selected: false, n: 0 },
                    { id: "AI response", note: "Output display", selected: false, n: 1 },
                    { id: "Sidebar", note: "Context panel", selected: false, n: 0 },
                  ].map((el, i) => (
                    <div key={el.id} className={`flex items-center justify-between px-4 py-3 ${el.selected ? "bg-black" : "bg-white"} ${i > 0 ? "border-t border-[#eaeaea]" : ""}`}>
                      <div>
                        <p className={`text-xs font-semibold ${el.selected ? "text-white" : "text-black"}`}>{el.id}</p>
                        <p className={`text-[10px] ${el.selected ? "text-white/50" : "text-[#aaa]"}`}>{el.note}</p>
                      </div>
                      {el.n > 0 && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${el.selected ? "bg-white/15 text-white/70" : "bg-[#f0f0f0] text-[#666]"}`}>
                          {el.n} note{el.n > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black rounded-lg py-2.5 text-xs text-white font-semibold text-center">Publish publicly</div>
                  <div className="border border-[#eaeaea] rounded-lg py-2.5 text-xs text-black text-center">Keep private</div>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-b border-[#eaeaea] overflow-hidden">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp>
            <div className="max-w-xl mx-auto text-center">
              <div key={quoteIdx} style={{ animation: "fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
                <p className="text-[1.2rem] font-medium text-black leading-relaxed tracking-tight mb-5">
                  &ldquo;{QUOTES[quoteIdx].text}&rdquo;
                </p>
                <p className="text-sm text-[#666]">
                  <span className="font-semibold text-black">{QUOTES[quoteIdx].author}</span>
                  <span className="mx-2 text-[#ddd]">·</span>
                  {QUOTES[quoteIdx].role}
                </p>
              </div>
              <div className="flex justify-center gap-1.5 mt-6">
                {QUOTES.map((_, i) => (
                  <button key={i} type="button" onClick={() => setQuoteIdx(i)}
                    className={`h-1 rounded-full transition-all duration-300 ${i === quoteIdx ? "w-6 bg-black" : "w-1.5 bg-[#e0e0e0]"}`} />
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── MARKETPLACE ───────────────────────────────────────────────────── */}
      {apps.length > 0 && (
        <section className="py-28 px-6 border-b border-[#eaeaea]">
          <div className="max-w-[1200px] mx-auto">
            <FadeUp>
              <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
                <div>
                  <p className="text-[11px] font-mono text-[#aaa] uppercase tracking-widest mb-2">Marketplace</p>
                  <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-semibold tracking-[-0.03em] text-black leading-[1.05]">Built by the community</h2>
                  <p className="text-sm text-[#666] mt-2 max-w-xs leading-relaxed">Use, clone, and remix any public app — or publish your own.</p>
                </div>
                <Link href="/market" className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 border border-[#eaeaea] rounded-lg text-black hover:border-black transition-colors duration-150">
                  Browse all apps →
                </Link>
              </div>
            </FadeUp>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.slice(0, 6).map((app, i) => (
                <FadeUp key={app.id} delay={s(i)}><MiniAppCard app={app} /></FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CREATORS ──────────────────────────────────────────────────────── */}
      {creators.length > 0 && (
        <section className="py-28 px-6 border-b border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-[1200px] mx-auto">
            <FadeUp>
              <p className="text-[11px] font-mono text-[#aaa] uppercase tracking-widest mb-2">Builders</p>
              <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-semibold tracking-[-0.03em] text-black mb-8">People shipping on Kyro</h2>
            </FadeUp>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {creators.slice(0, 6).map((c, i) => (
                <FadeUp key={c.handle} delay={s(i)}>
                  <Link href={`/profile/${c.handle}`} className="flex flex-col gap-3 rounded-xl border border-[#eaeaea] bg-white p-5 hover:border-black hover:shadow-[0_2px_16px_rgba(0,0,0,0.04)] transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-sm font-semibold shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-black">{c.name}</p>
                        <p className="text-[11px] text-[#aaa] font-mono">@{c.handle}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#666] leading-relaxed line-clamp-2 flex-1">{c.bio}</p>
                    <div className="flex gap-4 pt-3 mt-auto border-t border-[#eaeaea]">
                      <span className="text-[11px] text-[#bbb] font-mono">{c.appCount} apps</span>
                      <span className="text-[11px] text-[#bbb] font-mono">{c.totalUses.toLocaleString()} uses</span>
                    </div>
                  </Link>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-b border-[#eaeaea]">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp>
            <p className="text-[11px] font-mono text-[#aaa] uppercase tracking-widest mb-2">Pricing</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-semibold tracking-[-0.03em] text-black mb-2">Start free. Scale when ready.</h2>
            <p className="text-sm text-[#666] max-w-xs leading-relaxed mb-10">Bring your own key. No hidden usage fees from us.</p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {PLANS.map((p, i) => (
              <FadeUp key={p.name} delay={s(i)}>
                <div className={`rounded-xl border p-6 flex flex-col gap-4 h-full ${p.hi ? "border-black bg-black" : "border-[#eaeaea] bg-white"}`}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-[11px] font-mono uppercase tracking-widest ${p.hi ? "text-white/40" : "text-[#aaa]"}`}>{p.name}</p>
                      {p.hi && <span className="text-[10px] font-mono bg-white/15 text-white/70 px-2 py-0.5 rounded-full">Popular</span>}
                    </div>
                    <p className={`text-3xl font-semibold tracking-tight ${p.hi ? "text-white" : "text-black"}`}>
                      {p.price}<span className={`text-sm font-normal ml-1 ${p.hi ? "text-white/35" : "text-[#ccc]"}`}>{p.cadence}</span>
                    </p>
                    <p className={`text-sm mt-2 leading-relaxed ${p.hi ? "text-white/55" : "text-[#666]"}`}>{p.pitch}</p>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5">
                        <svg className={p.hi ? "text-white/35" : "text-[#4F46E5]"} width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={`text-sm ${p.hi ? "text-white/65" : "text-[#555]"}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={p.href} className={`inline-flex items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition-colors duration-150 ${p.hi ? "bg-white text-black hover:bg-[#f0f0f0]" : "border border-[#eaeaea] text-black hover:border-black"}`}>
                    {p.cta}
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={200}>
            <p className="text-[11px] text-[#ccc] text-center mt-8 font-mono">No platform fees on API usage · Cancel any time</p>
          </FadeUp>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-36 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, #c4c4c4 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse 65% 80% at 50% 50%, black 15%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 80% at 50% 50%, black 15%, transparent 100%)",
        }} />
        <div className="relative max-w-[1200px] mx-auto text-center">
          <FadeUp>
            <p className="text-[11px] font-mono text-[#aaa] uppercase tracking-widest mb-5">Ready?</p>
            <h2 className="text-[clamp(2.5rem,7vw,5.5rem)] font-semibold tracking-[-0.03em] text-black leading-[1.0] mb-5">
              Ship something<br /><span className="text-[#c0c0c0]">useful today.</span>
            </h2>
            <p className="text-sm text-[#666] max-w-xs mx-auto leading-relaxed mb-10">
              Join builders shipping focused, real AI tools that people actually use.
            </p>
            <div className="flex items-center gap-3 justify-center flex-wrap">
              <Link href="/onboarding?mode=signup" className="inline-flex items-center gap-2 text-sm font-semibold px-8 py-3.5 rounded-lg bg-black text-white hover:bg-[#4F46E5] transition-colors duration-150">
                Get started free
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5H10.5M10.5 6.5L7.5 3.5M10.5 6.5L7.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <Link href="/market" className="inline-flex items-center text-sm font-semibold px-8 py-3.5 rounded-lg border border-[#e0e0e0] text-black hover:border-black transition-colors duration-150">
                Browse marketplace
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  );
}
