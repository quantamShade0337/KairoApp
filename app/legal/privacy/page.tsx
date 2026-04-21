import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

const SECTIONS = [
  {
    title: "1. What we collect",
    body: "We collect information you provide when creating an account: name, email address, and username. We also collect usage data such as apps you create, clone, or interact with, and technical data including IP address, browser type, and device information.",
  },
  {
    title: "2. How we use it",
    body: "We use your data to operate and improve Kyro, to authenticate your account, to send important service updates, and to analyze usage patterns that help us build better features. We do not sell your personal data.",
  },
  {
    title: "3. Data sharing",
    body: "We share data with service providers who help us operate Kyro (e.g., hosting, analytics). These providers are contractually bound to protect your data. We may disclose data if required by law.",
  },
  {
    title: "4. Cookies",
    body: "We use cookies to maintain your session and preferences. You can disable cookies in your browser settings, though some features may not function correctly.",
  },
  {
    title: "5. Data retention",
    body: "We retain your data for as long as your account is active. When you delete your account, we delete your personal data within 30 days, except where retention is required by law.",
  },
  {
    title: "6. Your rights",
    body: "You have the right to access, correct, or delete your personal data. You can do this via Settings or by contacting us. You may also request a copy of your data at any time.",
  },
  {
    title: "7. Security",
    body: "We use industry-standard security measures to protect your data. No method of transmission over the internet is 100% secure, but we take reasonable steps to protect your information.",
  },
  {
    title: "8. Changes",
    body: "We may update this Privacy Notice. We will notify you of significant changes by email or via a notice on Kyro. Continued use after changes constitutes acceptance.",
  },
  {
    title: "9. Contact",
    body: "For privacy-related questions or requests, contact us at privacy@kyro.app.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 px-6">
        <div className="max-w-[720px] mx-auto">
          <div className="py-12 border-b border-[#eaeaea] mb-12">
            <div className="flex items-center gap-2 text-xs text-[#666] mb-4">
              <Link href="/" className="hover:text-black transition-colors duration-150">Kyro</Link>
              <span>/</span>
              <span>Privacy</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-black mb-2">Privacy Notice</h1>
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
            <Link href="/legal/terms" className="text-xs text-[#666] hover:text-black transition-colors duration-150">
              Terms & Conditions →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
