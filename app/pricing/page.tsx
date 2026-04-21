import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    note: "Prototype and explore.",
    cta: "Start free",
    href: "/onboarding",
    highlight: false,
    features: [
      "Up to 3 saved drafts",
      "Bring your own OpenAI or Claude key",
      "Private publishing",
      "Community marketplace access",
    ],
  },
  {
    name: "Pro",
    price: "$24",
    period: "/mo",
    note: "For solo builders shipping regularly.",
    cta: "Go Pro",
    href: "/onboarding",
    highlight: true,
    features: [
      "Unlimited drafts",
      "Public apps + remix attribution",
      "Priority publishing slots",
      "Version history + prompt snapshots",
    ],
  },
  {
    name: "Studio",
    price: "$99",
    period: "/mo",
    note: "For teams building AI products at scale.",
    cta: "Talk to us",
    href: "/about",
    highlight: false,
    features: [
      "Shared workspaces",
      "Collaborator roles",
      "Internal app collections",
      "Early access to hosted runtime",
    ],
  },
];

const INCLUDED = [
  "Prompt-first app builder",
  "OpenAI + Anthropic provider settings",
  "Draft saving and publishing",
  "Marketplace discovery and remixing",
];

const FAQ = [
  {
    q: "Do I need my own OpenAI or Claude key?",
    a: "Yes. Kyro is built around bring-your-own-model — you connect your own OpenAI or Anthropic credentials from day one.",
  },
  {
    q: "Can I keep apps private?",
    a: "Yes. Free lets you keep drafts private. Paid plans are better once you want to share widely or collaborate with a team.",
  },
  {
    q: "What am I paying for?",
    a: "The builder workflow, publishing surface, versioning, and collaboration layer. Not compute — that comes from your own key.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No lock-in. If you cancel, your apps and drafts stay accessible on the Free plan.",
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1 pt-14 pb-24">

        {/* Header */}
        <section className="border-b border-[#eaeaea] px-6 bg-[#fafafa]">
          <div className="mx-auto max-w-[1200px] py-16">
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-4">Pricing</p>
            <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-black mb-5 max-w-2xl">
              Simple pricing.
              <br />
              <span className="text-[#666]">Start free, grow when ready.</span>
            </h1>
            <p className="text-sm text-[#666] max-w-lg leading-relaxed">
              Bring your own model key and start building. Upgrade when you need more apps, better collaboration, or advanced publishing.
            </p>
          </div>
        </section>

        {/* Tiers */}
        <section className="border-b border-[#eaeaea] px-6 py-12">
          <div className="mx-auto max-w-[1200px] grid gap-4 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`flex flex-col rounded-xl border p-6 transition-shadow duration-150 ${
                  tier.highlight
                    ? "border-black bg-black text-white"
                    : "border-[#eaeaea] bg-white hover:border-black"
                }`}
              >
                {/* Tier name + badge */}
                <div className="flex items-center justify-between mb-5 pb-5 border-b border-[#eaeaea]/20">
                  <div>
                    <p className={`text-sm font-semibold ${tier.highlight ? "text-white" : "text-black"}`}>
                      {tier.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${tier.highlight ? "text-white/60" : "text-[#666]"}`}>
                      {tier.note}
                    </p>
                  </div>
                  {tier.highlight && (
                    <span className="text-[10px] font-mono uppercase tracking-widest bg-white text-black px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-end gap-1 mb-6">
                  <span className={`text-[2.8rem] font-semibold tracking-[-0.04em] leading-none ${tier.highlight ? "text-white" : "text-black"}`}>
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className={`pb-1 text-sm ${tier.highlight ? "text-white/50" : "text-[#666]"}`}>
                      {tier.period}
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2.5 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <svg
                        className={`mt-0.5 shrink-0 ${tier.highlight ? "text-white/50" : "text-black"}`}
                        width="12" height="12" viewBox="0 0 12 12" fill="none"
                      >
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className={`text-sm leading-snug ${tier.highlight ? "text-white/80" : "text-[#666]"}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={tier.href}
                  className={`inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    tier.highlight
                      ? "bg-white text-black hover:bg-[#f0f0f0]"
                      : "border border-[#eaeaea] text-black hover:border-black hover:bg-[#fafafa]"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* What's included in all plans */}
        <section className="border-b border-[#eaeaea] px-6 py-14">
          <div className="mx-auto max-w-[1200px] grid gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-5">Every plan</p>
              <h2 className="text-2xl font-semibold tracking-tight text-black mb-8">Included on all tiers</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {INCLUDED.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-lg border border-[#eaeaea] px-4 py-3">
                    <svg className="mt-0.5 shrink-0 text-black" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-sm text-[#666]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-5">FAQ</p>
              <h2 className="text-2xl font-semibold tracking-tight text-black mb-8">Common questions</h2>
              <div className="space-y-6">
                {FAQ.map((item) => (
                  <div key={item.q} className="border-b border-[#eaeaea] pb-6 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-black mb-2">{item.q}</p>
                    <p className="text-sm text-[#666] leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-xl border border-[#eaeaea] p-8">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-black mb-1">
                  Build the first version free.
                </h2>
                <p className="text-sm text-[#666]">Upgrade when your app is worth sharing broadly.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link
                  href="/builder/new"
                  className="inline-flex items-center text-sm bg-black text-white px-5 py-2.5 rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
                >
                  Open builder
                </Link>
                <Link
                  href="/market"
                  className="inline-flex items-center text-sm border border-[#eaeaea] text-black px-5 py-2.5 rounded-md hover:border-black transition-colors duration-150"
                >
                  Browse apps
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
