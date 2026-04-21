import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-4">404</p>
        <h1 className="text-4xl font-semibold tracking-tight text-black mb-3">Page not found</h1>
        <p className="text-sm text-[#666] mb-8 max-w-xs">
          This page doesn&apos;t exist. It may have been moved or deleted.
        </p>
        <div className="flex gap-3">
          <Link
            href="/"
            className="text-sm border border-[#eaeaea] px-5 py-2.5 rounded-md text-black hover:border-black transition-colors duration-150"
          >
            Go home
          </Link>
          <Link
            href="/market"
            className="text-sm bg-black text-white px-5 py-2.5 rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
          >
            Explore apps
          </Link>
        </div>
      </main>
    </div>
  );
}
