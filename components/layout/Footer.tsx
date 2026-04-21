import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#eaeaea] mt-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-[#666]">
          &copy; {new Date().getFullYear()} Kyro. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/about" className="text-xs text-[#666] hover:text-black transition-colors duration-150">About</Link>
          <Link href="/pricing" className="text-xs text-[#666] hover:text-black transition-colors duration-150">Pricing</Link>
          <Link href="/legal/terms" className="text-xs text-[#666] hover:text-black transition-colors duration-150">Terms</Link>
          <Link href="/legal/privacy" className="text-xs text-[#666] hover:text-black transition-colors duration-150">Privacy</Link>
          <Link href="/market" className="text-xs text-[#666] hover:text-black transition-colors duration-150">Explore</Link>
        </div>
      </div>
    </footer>
  );
}
