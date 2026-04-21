"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { requestJson } from "@/lib/http-client";
import type { PublicApp, PublicProject } from "@/lib/backend/types";

type DashboardResponse = {
  user: {
    id: string;
    name: string;
    handle: string;
  };
  stats: {
    projects: number;
    published: number;
    totalUses: number;
    clones: number;
  };
  projects: Array<PublicProject & { relativeUpdatedAt: string }>;
  apps: PublicApp[];
};

type SessionResponse = {
  authenticated: boolean;
  user: {
    name: string;
    handle: string;
  } | null;
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft: { text: "Draft", cls: "text-[#666] bg-[#f5f5f5]" },
  published: { text: "Published", cls: "text-[#4F46E5] bg-[#eef2ff]" },
  private: { text: "Private", cls: "text-[#666] bg-[#f5f5f5]" },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionResolved, setSessionResolved] = useState(false);
  const isAuthenticated = Boolean(data);
  const onboardingHref = "/onboarding?mode=signin&redirectTo=%2Fdashboard&reason=Sign%20in%20to%20open%20your%20dashboard.";

  useEffect(() => {
    let active = true;

    requestJson<SessionResponse>("/api/auth/session")
      .then(async (session) => {
        if (!active) {
          return;
        }

        setSessionResolved(true);

        if (!session.authenticated) {
          setData(null);
          setError("Sign in to view your dashboard.");
          setLoading(false);
          return;
        }

        const payload = await requestJson<DashboardResponse>("/api/dashboard");
        if (active) {
          setData(payload);
          setError(null);
          setLoading(false);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard.");
          setSessionResolved(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 pt-14 pb-24">
        <div className="border-b border-[#eaeaea] bg-[#fafafa] px-6">
          <div className="max-w-[1200px] mx-auto py-10 flex items-end justify-between">
            <div>
              <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-2">Dashboard</p>
              <h1 className="text-3xl font-semibold tracking-tight text-black">
                {data ? `Good to see you, ${data.user.name.split(" ")[0]}.` : "Your workspace"}
              </h1>
            </div>
            <div className="flex gap-2.5 items-center">
              <Link
                href="/market"
                className="inline-flex items-center text-sm border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
              >
                Explore
              </Link>
              <Link
                href={isAuthenticated ? "/builder/new" : onboardingHref}
                className="inline-flex items-center text-sm bg-black text-white px-4 py-2 rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
              >
                {isAuthenticated ? "+ New project" : "Sign in to build"}
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-6">
          {loading || !sessionResolved ? (
            <div className="py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-b border-[#eaeaea]">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="border border-[#eaeaea] rounded-lg px-5 py-4 bg-white">
                    <div className="skeleton h-3 w-20 rounded mb-3" />
                    <div className="skeleton h-8 w-16 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="py-16">
              <EmptyState
                message="You need an account to view the dashboard"
                sub={error}
                action={{ label: "Sign in to continue", href: onboardingHref }}
              />
            </div>
          ) : data ? (
            <>
              {(data.stats.projects === 0 || data.stats.published === 0) && (
                <section className="pt-8">
                  <div className="border border-[#eaeaea] rounded-xl p-6 bg-[#fafafa]">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      <div>
                        <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-2">Quick start</p>
                        <h2 className="text-xl font-semibold text-black mb-2">Go from idea to published app</h2>
                        <p className="text-sm text-[#666] max-w-xl">
                          The simplest path is: create a project, save your draft, publish it, then open the public app page to share or iterate.
                        </p>
                      </div>
                      <Link
                        href={data.stats.projects === 0 ? "/builder/new" : "/publish"}
                        className="inline-flex items-center text-sm bg-black text-white px-4 py-2 rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
                      >
                        {data.stats.projects === 0 ? "Create first project" : "Publish your first app"}
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                      {[
                        { label: "1. Start a project", done: data.stats.projects > 0 },
                        { label: "2. Save your draft", done: data.stats.projects > 0 },
                        { label: "3. Publish it", done: data.stats.published > 0 },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg border border-[#eaeaea] bg-white px-4 py-3">
                          <p className="text-sm text-black">{item.label}</p>
                          <p className={`text-xs font-mono mt-1 ${item.done ? "text-[#10B981]" : "text-[#666]"}`}>
                            {item.done ? "Done" : "Next"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-b border-[#eaeaea]">
                {[
                  { label: "Projects", value: data.stats.projects },
                  { label: "Published", value: data.stats.published },
                  { label: "Total uses", value: data.stats.totalUses.toLocaleString() },
                  { label: "Clones", value: data.stats.clones },
                ].map((stat) => (
                  <div key={stat.label} className="border border-[#eaeaea] rounded-lg px-5 py-4 bg-white">
                    <p className="text-xs text-[#666] font-mono mb-2">{stat.label}</p>
                    <p className="text-2xl font-semibold text-black tracking-tight tabular-nums">{stat.value}</p>
                  </div>
                ))}
              </div>

              <section className="py-10 border-b border-[#eaeaea]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-semibold text-black">Recent projects</h2>
                  <Link href="/builder/new" className="text-xs text-[#666] hover:text-black transition-colors duration-150 flex items-center gap-1">
                    New project <span>+</span>
                  </Link>
                </div>

                {data.projects.length === 0 ? (
                  <EmptyState
                    message="No projects yet"
                    sub="Create your first project to get started."
                    action={{ label: "New project", href: "/builder/new" }}
                  />
                ) : (
                  <div className="border border-[#eaeaea] rounded-xl overflow-hidden">
                    {data.projects.map((project, index) => (
                      <Link
                        key={project.id}
                        href={`/builder/${project.id}`}
                        className={`flex items-center justify-between px-5 py-4 hover:bg-[#fafafa] transition-colors duration-150 group ${
                          index > 0 ? "border-t border-[#eaeaea]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-[#eaeaea] group-hover:bg-black transition-colors duration-150 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-black group-hover:text-[#4F46E5] transition-colors duration-150 truncate">
                              {project.name}
                            </p>
                            <p className="text-xs text-[#666] mt-0.5 truncate hidden sm:block">{project.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <div className="hidden md:flex gap-1">
                            {project.collaborators.slice(0, 3).map((collaborator) => (
                              <div
                                key={collaborator}
                                title={`@${collaborator}`}
                                className="w-5 h-5 rounded-full bg-[#eaeaea] flex items-center justify-center text-[9px] font-semibold text-black"
                              >
                                {collaborator.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${STATUS_LABEL[project.status].cls}`}>
                            {STATUS_LABEL[project.status].text}
                          </span>
                          <span className="text-[11px] text-[#666] font-mono hidden md:block">{project.relativeUpdatedAt}</span>
                          <span className="text-[#666] group-hover:text-black transition-colors duration-150 text-xs">→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="py-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-semibold text-black">Published apps</h2>
                  <Link href={`/profile/${data.user.handle}`} className="text-xs text-[#666] hover:text-black transition-colors duration-150">
                    View profile →
                  </Link>
                </div>
                {data.apps.length === 0 ? (
                  <EmptyState
                    message="No published apps"
                    sub="Publish a project to see it here."
                    action={{ label: "Open publish", href: "/publish" }}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.apps.map((app) => (
                      <Link
                        key={app.id}
                        href={`/market/${app.id}`}
                        className="border border-[#eaeaea] rounded-xl p-5 hover:border-black transition-all duration-150 flex flex-col gap-2.5 group bg-white"
                      >
                        <p className="text-sm font-semibold text-black group-hover:text-[#4F46E5] transition-colors duration-150">
                          {app.name}
                        </p>
                        <p className="text-xs text-[#666] line-clamp-2 leading-relaxed">{app.description}</p>
                        <div className="flex items-center justify-between pt-3 mt-auto border-t border-[#eaeaea]">
                          <span className="text-[11px] text-[#666] font-mono">{app.uses.toLocaleString()} uses</span>
                          <span className="text-[11px] text-[#666] font-mono">{app.clones} clones</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function EmptyState({
  message,
  sub,
  action,
}: {
  message: string;
  sub: string;
  action: { label: string; href: string };
}) {
  return (
    <div className="border border-dashed border-[#eaeaea] rounded-xl py-14 text-center">
      <p className="text-sm font-medium text-black mb-1.5">{message}</p>
      <p className="text-xs text-[#666] mb-6 max-w-xs mx-auto">{sub}</p>
      <Link
        href={action.href}
        className="inline-flex items-center text-xs border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
      >
        {action.label}
      </Link>
    </div>
  );
}
