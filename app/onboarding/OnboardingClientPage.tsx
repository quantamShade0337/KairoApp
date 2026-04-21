"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import { requestJson } from "@/lib/http-client";
import type { UserInterest } from "@/lib/backend/types";

type Step = 1 | 2 | 3;
type Mode = "signup" | "signin";

const INTERESTS = [
  { id: "builder", label: "Builder", desc: "I want to create and publish apps." },
  { id: "explorer", label: "Explorer", desc: "I want to discover and use apps." },
  { id: "both", label: "Both", desc: "I do a bit of everything." },
] as const satisfies ReadonlyArray<{ id: UserInterest; label: string; desc: string }>;

export default function OnboardingClientPage({
  initialMode,
  redirectTo,
  initialReason,
}: {
  initialMode: Mode;
  redirectTo: string;
  initialReason: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>(1);
  const [interest, setInterest] = useState<UserInterest | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialReason || null);

  const step1Valid =
    email.includes("@") &&
    password.length >= 8 &&
    (mode === "signin" || name.trim().length > 0);

  async function submitSignin() {
    setSubmitting(true);
    setError(null);

    try {
      await requestJson("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(redirectTo || "/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSignup() {
    if (!interest) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await requestJson("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password, interest }),
      });
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        setStep(3);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForMode(nextMode: Mode) {
    setMode(nextMode);
    setStep(1);
    setError(null);
    setNotice(initialReason || null);
  }

  const switchHref =
    mode === "signin"
      ? `/onboarding?mode=signup${redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ""}${
          initialReason ? `&reason=${encodeURIComponent(initialReason)}` : ""
        }`
      : `/onboarding?mode=signin${redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ""}${
          initialReason ? `&reason=${encodeURIComponent(initialReason)}` : ""
        }`;

  function handleStepOneSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!step1Valid || submitting) {
      return;
    }

    if (mode === "signin") {
      void submitSignin();
      return;
    }

    setStep(2);
    setError(null);
    setNotice(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="border-b border-[#eaeaea] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-black hover:opacity-60 transition-opacity duration-150">
          Kyro
        </Link>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className={`rounded-full transition-all duration-200 ${
                mode === "signin"
                  ? index === 1
                    ? "w-6 h-1.5 bg-black"
                    : "w-4 h-1.5 bg-[#eaeaea]"
                  : index <= step
                    ? "w-6 h-1.5 bg-black"
                    : "w-4 h-1.5 bg-[#eaeaea]"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {notice && (
            <div className="mb-6 rounded-lg border border-[#eaeaea] bg-[#fafafa] px-4 py-3">
              <p className="text-sm text-black">{notice}</p>
            </div>
          )}
          {step === 1 && (
            <div className="flex flex-col gap-7">
              <div>
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">
                  {mode === "signup" ? "1 / 3" : "Sign in"}
                </p>
                <h1 className="text-[2rem] font-semibold tracking-tight text-black leading-tight mb-2">
                  {mode === "signup" ? "Create your account" : "Welcome back"}
                </h1>
                <p className="text-sm text-[#666]">
                  {mode === "signup" ? "No credit card required." : "Pick up where you left off."}
                </p>
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleStepOneSubmit}>
                {mode === "signup" && (
                  <Input
                    label="Full name"
                    placeholder="Alex Chen"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                  />
                )}
                <Input
                  label="Email"
                  type="email"
                  placeholder={mode === "signin" ? "alexc@kyro.dev" : "alex@example.com"}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-black">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={mode === "signin" ? "password123" : "At least 8 characters"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      className="w-full border border-[#eaeaea] rounded-md px-3 py-2 pr-10 text-sm text-black placeholder:text-[#666] outline-none focus:border-black transition-colors duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-black transition-colors duration-150 text-xs font-mono"
                    >
                      {showPassword ? "hide" : "show"}
                    </button>
                  </div>
                  {mode === "signup" && password.length > 0 && password.length < 8 && (
                    <p className="text-[11px] text-[#666] font-mono">{8 - password.length} more characters needed</p>
                  )}
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={!step1Valid || submitting}
                  className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Working..." : mode === "signin" ? "Sign in" : "Continue"}
                </button>
              </form>

              <p className="text-sm text-[#666]">
                {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
                <Link
                  href={switchHref}
                  onClick={() => resetForMode(mode === "signin" ? "signup" : "signin")}
                  className="text-black hover:opacity-60 transition-opacity duration-150"
                >
                  {mode === "signin" ? "Create one" : "Sign in"}
                </Link>
              </p>

              <div className="rounded-lg border border-dashed border-[#eaeaea] p-4">
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-2">Demo account</p>
                <p className="text-sm text-black">`alexc@kyro.dev`</p>
                <p className="text-sm text-black mt-1">`password123`</p>
              </div>
            </div>
          )}

          {mode === "signup" && step === 2 && (
            <div className="flex flex-col gap-7">
              <div>
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">2 / 3</p>
                <h1 className="text-[2rem] font-semibold tracking-tight text-black leading-tight mb-2">
                  What brings you here?
                </h1>
                <p className="text-sm text-[#666]">We&apos;ll tailor the workspace around that.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                {INTERESTS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setInterest(item.id)}
                    className={`text-left border rounded-lg px-5 py-4 transition-all duration-150 ${
                      interest === item.id ? "border-black bg-black" : "border-[#eaeaea] hover:border-black bg-white"
                    }`}
                  >
                    <p className={`text-sm font-medium mb-0.5 ${interest === item.id ? "text-white" : "text-black"}`}>
                      {item.label}
                    </p>
                    <p className={`text-xs leading-relaxed ${interest === item.id ? "text-white/60" : "text-[#666]"}`}>
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                onClick={() => void submitSignup()}
                disabled={!interest || submitting}
                className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating account..." : "Continue"}
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className="text-xs text-[#666] hover:text-black transition-colors duration-150 text-center"
              >
                ← Back
              </button>
              <p className="text-sm text-[#666] text-center">
                Already have an account?{" "}
                <Link
                  href={switchHref}
                  onClick={() => resetForMode("signin")}
                  className="text-black hover:opacity-60 transition-opacity duration-150"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {mode === "signup" && step === 3 && (
            <div className="flex flex-col gap-7">
              <div>
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">3 / 3</p>
                <h1 className="text-[2rem] font-semibold tracking-tight text-black leading-tight mb-2">You&apos;re in.</h1>
                <p className="text-sm text-[#666]">Where do you want to start?</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => router.push("/builder/new")}
                  className="text-left border border-[#eaeaea] rounded-lg px-5 py-4 hover:border-black transition-colors duration-150 bg-white group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-black">Create first project</p>
                    <span className="text-[#666] group-hover:text-black transition-colors duration-150 text-sm">→</span>
                  </div>
                  <p className="text-xs text-[#666] mt-0.5">Start building an app from scratch.</p>
                </button>
                <button
                  onClick={() => router.push("/market")}
                  className="text-left border border-[#eaeaea] rounded-lg px-5 py-4 hover:border-black transition-colors duration-150 bg-white group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-black">Explore apps</p>
                    <span className="text-[#666] group-hover:text-black transition-colors duration-150 text-sm">→</span>
                  </div>
                  <p className="text-xs text-[#666] mt-0.5">Browse what the community built.</p>
                </button>
              </div>
              <button
                onClick={() => router.push(redirectTo || "/dashboard")}
                className="w-full py-2.5 border border-[#eaeaea] text-[#666] text-sm rounded-md hover:border-black hover:text-black transition-colors duration-150"
              >
                {redirectTo ? "Continue" : "Go to dashboard"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
