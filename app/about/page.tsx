import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">

          <div className="py-16 border-b border-[#eaeaea] mb-16 max-w-2xl">
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-6">About</p>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-tight text-black leading-[1.1] mb-6">
              Build small apps.
              <br />
              Share them instantly.
            </h1>
            <p className="text-base text-[#666] leading-relaxed">
              Kyro is a multiplayer app builder for small, useful, remixable tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-3xl mb-20">
            <div>
              <h2 className="text-lg font-semibold text-black mb-4">What is Kyro</h2>
              <p className="text-sm text-[#666] leading-relaxed">
                Kyro is a platform where builders create and publish small, focused apps — tools they wish existed. Anyone can use them instantly, clone them, and build on top of them.
              </p>
              <p className="text-sm text-[#666] leading-relaxed mt-3">
                It combines a builder, a collaboration layer, and a marketplace in one tight loop: discover, use, clone, modify, publish.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black mb-4">Why it exists</h2>
              <p className="text-sm text-[#666] leading-relaxed">
                Most tools to build apps are too heavy. Most app stores ship slow. We believe small tools should be built fast and shared instantly.
              </p>
              <p className="text-sm text-[#666] leading-relaxed mt-3">
                Kyro is for the person who has an idea on Tuesday and wants it in front of other people by Wednesday.
              </p>
            </div>
          </div>

          <div className="border-t border-[#eaeaea] pt-16 max-w-2xl">
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-6">The loop</p>
            <div className="flex flex-col gap-6">
              {[
                ["Discover", "Browse real, working tools built by the community."],
                ["Use instantly", "No setup. No account required to try."],
                ["Clone", "Fork any app and make it yours."],
                ["Modify", "Change it in the builder."],
                ["Publish", "Ship it. Others find it and remix it."],
              ].map(([title, body], i) => (
                <div key={title} className="flex gap-5">
                  <span className="text-xs font-mono text-[#666] w-5 shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm font-medium text-black">{title}</p>
                    <p className="text-sm text-[#666] mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#eaeaea] pt-16 mt-16">
            <Link
              href="/onboarding?mode=signup"
              className="inline-flex items-center text-sm font-medium px-6 py-3 bg-black text-white rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
            >
              Get started
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
