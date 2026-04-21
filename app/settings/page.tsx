"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Input from "@/components/ui/Input";
import { requestJson } from "@/lib/http-client";
import type { PublicUser } from "@/lib/backend/types";

type Section = "profile" | "preferences" | "account";

type ProfileResponse = {
  profile: PublicUser;
};

export default function SettingsPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("profile");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<PublicUser["verificationStatus"]>("unverified");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    requestJson<ProfileResponse>("/api/settings/profile")
      .then((payload) => {
        if (active) {
          setName(payload.profile.name);
          setUsername(payload.profile.handle);
          setBio(payload.profile.bio);
          setEmail(payload.profile.email);
          setVerificationStatus(payload.profile.verificationStatus);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load settings.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    setError(null);

    try {
      const payload = await requestJson<ProfileResponse>("/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, handle: username, bio }),
      });

      setName(payload.profile.name);
      setUsername(payload.profile.handle);
      setBio(payload.profile.bio);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save settings.");
    }
  }

  async function handleSignOut() {
    await requestJson("/api/auth/signout", {
      method: "POST",
    });
    router.push("/");
    router.refresh();
  }

  const NAV: { id: Section; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "preferences", label: "Preferences" },
    { id: "account", label: "Account" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="py-12 border-b border-[#eaeaea] mb-10">
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Settings</p>
            <h1 className="text-3xl font-semibold tracking-tight text-black">Account settings</h1>
          </div>

          {loading ? (
            <div className="max-w-lg">
              <div className="skeleton h-10 w-full rounded mb-4" />
              <div className="skeleton h-10 w-full rounded mb-4" />
              <div className="skeleton h-24 w-full rounded" />
            </div>
          ) : error && !name ? (
            <div className="border border-dashed border-[#eaeaea] rounded-xl py-14 text-center">
              <p className="text-sm font-medium text-black mb-1.5">Sign in to manage settings</p>
              <p className="text-xs text-[#666] mb-6 max-w-xs mx-auto">{error}</p>
              <button
                onClick={() => router.push("/onboarding")}
                className="inline-flex items-center text-xs border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
              >
                Go to onboarding
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10">
              <nav className="flex flex-row md:flex-col gap-1">
                {NAV.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={`text-left text-sm px-3 py-2 rounded-md transition-colors duration-150 ${
                      section === item.id ? "bg-black text-white" : "text-[#666] hover:text-black hover:bg-[#fafafa]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="max-w-lg">
                {section === "profile" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4 pb-6 border-b border-[#eaeaea]">
                      <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-white text-xl font-semibold">
                        {name.charAt(0).toUpperCase() || "A"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{name}</p>
                        <p className="text-xs text-[#666] mt-0.5">@{username}</p>
                        <p className="text-[11px] font-mono mt-2 text-[#666]">
                          Verification: <span className="text-black capitalize">{verificationStatus}</span>
                        </p>
                      </div>
                    </div>
                    <Input label="Full name" value={name} onChange={(event) => setName(event.target.value)} />
                    <Input label="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
                    <Input label="Email" type="email" value={email} readOnly className="opacity-50 cursor-not-allowed" />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-black">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(event) => setBio(event.target.value)}
                        rows={4}
                        className="w-full border border-[#eaeaea] rounded-md px-3 py-2 text-sm text-black placeholder:text-[#666] outline-none focus:border-black transition-colors duration-150 resize-none"
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button
                      onClick={() => void handleSave()}
                      className="w-fit px-5 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
                    >
                      {saved ? "Saved" : "Save changes"}
                    </button>
                    {(verificationStatus === "unverified" || verificationStatus === "pending") && (
                      <Link
                        href="/publish"
                        className="inline-flex w-fit text-xs border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
                      >
                        {verificationStatus === "pending" ? "Review pending ticket" : "Request verification"}
                      </Link>
                    )}
                  </div>
                )}

                {section === "preferences" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between py-4 border-b border-[#eaeaea]">
                      <div>
                        <p className="text-sm font-medium text-black">Theme</p>
                        <p className="text-xs text-[#666] mt-0.5">Kyro currently ships with a clean light theme.</p>
                      </div>
                      <span className="text-xs px-3 py-1.5 rounded border border-black text-black">Light</span>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-[#eaeaea]">
                      <div>
                        <p className="text-sm font-medium text-black">Product updates</p>
                        <p className="text-xs text-[#666] mt-0.5">Important account updates are sent to your primary email.</p>
                      </div>
                      <span className="text-xs px-3 py-1.5 rounded border border-[#eaeaea] text-[#666]">Enabled</span>
                    </div>
                  </div>
                )}

                {section === "account" && (
                  <div className="flex flex-col gap-6">
                    <div className="py-4 border-b border-[#eaeaea]">
                      <p className="text-sm font-medium text-black mb-1">Data</p>
                      <p className="text-xs text-[#666] mb-4">Projects and account data are stored in your workspace datastore.</p>
                    </div>
                    <div className="py-4 border-b border-[#eaeaea]">
                      <p className="text-sm font-medium text-black mb-1">Sign out</p>
                      <p className="text-xs text-[#666] mb-4">End your current Kyro session.</p>
                      <button
                        onClick={() => void handleSignOut()}
                        className="inline-flex text-xs border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
                      >
                        Sign out
                      </button>
                    </div>
                    <div className="py-4">
                      <p className="text-sm font-medium text-black mb-1">Account support</p>
                      <p className="text-xs text-[#666] mb-4">Need account-level help? Contact support from the onboarding page while signed in.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
