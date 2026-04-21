"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { requestJson } from "@/lib/http-client";

type SessionResponse = {
  authenticated: boolean;
  user: {
    name: string;
    handle: string;
  } | null;
};

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<SessionResponse>({ authenticated: false, user: null });
  const [sessionResolved, setSessionResolved] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [menuOpen]);

  useEffect(() => {
    let active = true;

    requestJson<SessionResponse>("/api/auth/session")
      .then((payload) => {
        if (active) {
          setSession(payload);
          setSessionResolved(true);
        }
      })
      .catch(() => {
        if (active) {
          setSession({ authenticated: false, user: null });
          setSessionResolved(true);
        }
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  const navLink = (href: string, label: string) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`text-sm transition-colors duration-150 hover:text-black relative py-1 ${
          active ? "text-black" : "text-[#666]"
        }`}
        onClick={() => setMenuOpen(false)}
      >
        {label}
        {active && (
          <span className="absolute bottom-0 left-0 right-0 h-px bg-black rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#eaeaea]">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-semibold text-sm tracking-tight text-black hover:opacity-60 transition-opacity duration-150"
        >
          Kyro
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {navLink("/market", "Explore")}
          {navLink("/pricing", "Pricing")}
          {navLink("/about", "About")}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {!sessionResolved ? (
            <div className="h-7 w-32 rounded-md bg-[#f5f5f5]" />
          ) : session.authenticated ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-[#666] hover:text-black transition-colors duration-150 px-1"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-medium hover:bg-[#4F46E5] transition-colors duration-150"
                title="Settings"
              >
                {session.user?.name.charAt(0).toUpperCase() ?? "A"}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/onboarding?mode=signin"
                className="text-sm text-[#666] hover:text-black transition-colors duration-150 px-1"
              >
                Sign in
              </Link>
              <Link
                href="/onboarding?mode=signup"
                className="text-sm bg-black text-white px-4 py-1.5 rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden text-[#666] hover:text-black transition-colors duration-150 p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
        >
          {menuOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4.5H14M2 8H14M2 11.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav-menu" className="md:hidden border-t border-[#eaeaea] bg-white">
          <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-col gap-4">
            <Link href="/market" className="text-sm text-[#666] hover:text-black transition-colors duration-150" onClick={() => setMenuOpen(false)}>Explore</Link>
            <Link href="/pricing" className="text-sm text-[#666] hover:text-black transition-colors duration-150" onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link href="/about" className="text-sm text-[#666] hover:text-black transition-colors duration-150" onClick={() => setMenuOpen(false)}>About</Link>
            {!sessionResolved ? null : session.authenticated ? (
              <div className="flex gap-3 pt-3 border-t border-[#eaeaea]">
                <Link href="/dashboard" className="text-sm text-[#666] hover:text-black transition-colors duration-150" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link href="/settings" className="text-sm bg-black text-white px-4 py-1.5 rounded-md hover:bg-[#4F46E5] transition-colors duration-150" onClick={() => setMenuOpen(false)}>Settings</Link>
              </div>
            ) : (
              <div className="flex gap-3 pt-3 border-t border-[#eaeaea]">
                <Link href="/onboarding?mode=signin" className="text-sm text-[#666] hover:text-black transition-colors duration-150" onClick={() => setMenuOpen(false)}>Sign in</Link>
                <Link href="/onboarding?mode=signup" className="text-sm bg-black text-white px-4 py-1.5 rounded-md hover:bg-[#4F46E5] transition-colors duration-150" onClick={() => setMenuOpen(false)}>Get started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
