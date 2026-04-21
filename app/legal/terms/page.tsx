import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: "By accessing or using Kyro, you agree to be bound by these Terms. If you do not agree to these terms, do not use the service.",
  },
  {
    title: "2. Use of the service",
    body: "You may use Kyro to create, publish, and discover apps. You are responsible for all content you create and publish. You must not use Kyro for unlawful purposes or to distribute malicious software.",
  },
  {
    title: "3. Intellectual property",
    body: "You retain ownership of apps you build on Kyro. By publishing an app as public, you grant other users a non-exclusive license to use and clone your app. Kyro does not claim ownership of your content.",
  },
  {
    title: "4. User conduct",
    body: "You agree not to upload harmful, defamatory, or illegal content. You agree not to attempt to gain unauthorized access to other users' accounts or Kyro's infrastructure.",
  },
  {
    title: "5. Cloning and remixing",
    body: "Apps marked as public may be cloned and remixed by other users. The original creator is attributed. Remixed apps are separate works owned by their respective creators.",
  },
  {
    title: "6. Termination",
    body: "Kyro reserves the right to suspend or terminate accounts that violate these terms. You may close your account at any time via Settings.",
  },
  {
    title: "7. Limitation of liability",
    body: "Kyro is provided 'as is.' To the extent permitted by law, Kyro disclaims all warranties and shall not be liable for any indirect or consequential damages.",
  },
  {
    title: "8. Changes to terms",
    body: "We may update these Terms from time to time. Continued use of Kyro after changes constitutes acceptance of the new terms.",
  },
  {
    title: "9. Contact",
    body: "For questions about these Terms, contact us at legal@kyro.app.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 px-6">
        <div className="max-w-[720px] mx-auto">
          <div className="py-12 border-b border-[#eaeaea] mb-12">
            <div className="flex items-center gap-2 text-xs text-[#666] mb-4">
              <Link href="/" className="hover:text-black transition-colors duration-150">Kyro</Link>
              <span>/</span>
              <span>Terms</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-black mb-2">Terms & Conditions</h1>
            <p className="text-xs text-[#666] font-mono">Last updated: April 2025</p>
          </div>

          <div className="flex flex-col gap-10">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-semibold text-black mb-3">{section.title}</h2>
                <p className="text-sm text-[#666] leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-[#eaeaea] flex gap-4">
            <Link href="/legal/privacy" className="text-xs text-[#666] hover:text-black transition-colors duration-150">
              Privacy Notice →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
