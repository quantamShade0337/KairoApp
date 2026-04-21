"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BuilderWizard from "@/app/builder/[id]/BuilderWizard";
import { requestJson } from "@/lib/http-client";
import type { PublicProject } from "@/lib/backend/types";

type ProjectResponse = { project: PublicProject };
type SessionResponse = { authenticated: boolean; user: { name: string; handle: string } | null };
type ApiProvider = "openai" | "anthropic";
type AppSurface = "chat" | "assistant" | "agent";
type VoicePreset = "concise" | "friendly" | "expert";

type WorkspaceDraft = {
  version: "kyro-workspace-v1";
  prompt: string;
  firstMessage: string;
  apiProvider: ApiProvider;
  apiKey: string;
  model: string;
  voice: VoicePreset;
  appSurface: AppSurface;
  knowledge: string;
  guardrails: string;
};

const DEFAULT_DESCRIPTION = "An AI app with its own prompt, model, and API key.";

const DEFAULT_WORKSPACE: WorkspaceDraft = {
  version: "kyro-workspace-v1",
  prompt: "",
  firstMessage: "",
  apiProvider: "openai",
  apiKey: "",
  model: "gpt-5.1",
  voice: "friendly",
  appSurface: "chat",
  knowledge: "",
  guardrails: "Do not fabricate facts. Ask a follow-up when key details are missing.",
};

const PROMPT_STARTERS = [
  "A support copilot that answers from our docs and hands off billing issues.",
  "A recruiting assistant that qualifies applicants before a human interview.",
  "A sales demo bot that explains product plans and captures leads.",
  "A private team assistant that turns notes into next steps and summaries.",
];

const SURFACE_OPTIONS: Array<{ value: AppSurface; label: string; description: string }> = [
  { value: "chat", label: "Chat", description: "Classic back-and-forth conversation." },
  { value: "assistant", label: "Assistant", description: "Structured, guided workflow." },
  { value: "agent", label: "Agent", description: "Multi-step autonomous behavior." },
];

const VOICE_OPTIONS: Array<{ value: VoicePreset; label: string; description: string }> = [
  { value: "friendly", label: "Friendly", description: "Warm, helpful for general users." },
  { value: "concise", label: "Concise", description: "Short answers, no filler." },
  { value: "expert", label: "Expert", description: "Technical, precise, direct." },
];

function parseWorkspaceDraft(serialized: string): WorkspaceDraft {
  try {
    const parsed = JSON.parse(serialized) as Partial<WorkspaceDraft>;
    if (parsed.version === "kyro-workspace-v1") {
      return {
        version: "kyro-workspace-v1",
        prompt: parsed.prompt ?? "",
        firstMessage: parsed.firstMessage ?? "",
        apiProvider: parsed.apiProvider === "anthropic" ? "anthropic" : "openai",
        apiKey: parsed.apiKey ?? "",
        model: parsed.model ?? (parsed.apiProvider === "anthropic" ? "claude-3-7-sonnet" : "gpt-5.1"),
        voice: parsed.voice === "concise" || parsed.voice === "expert" ? parsed.voice : "friendly",
        appSurface: parsed.appSurface === "assistant" || parsed.appSurface === "agent" ? parsed.appSurface : "chat",
        knowledge: parsed.knowledge ?? "",
        guardrails: parsed.guardrails ?? DEFAULT_WORKSPACE.guardrails,
      };
    }
  } catch {}
  return { ...DEFAULT_WORKSPACE, prompt: serialized.trim(), knowledge: serialized.trim() ? "Imported from an older draft." : "" };
}

function serializeWorkspaceDraft(w: WorkspaceDraft) {
  return JSON.stringify(w, null, 2);
}

function summarizePrompt(prompt: string) {
  const compact = prompt.trim().replace(/\s+/g, " ");
  if (!compact) return "No prompt yet.";
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}

export default function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNewRoute = id === "new";

  return <BuilderWizard projectId={id} />;

  const [projectId, setProjectId] = useState<string | null>(isNewRoute ? null : id);
  const [workspace, setWorkspace] = useState<WorkspaceDraft>(DEFAULT_WORKSPACE);
  const [projectName, setProjectName] = useState("Untitled app");
  const [projectDescription, setProjectDescription] = useState(DEFAULT_DESCRIPTION);
  const [editingName, setEditingName] = useState(isNewRoute);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNewRoute);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    isNewRoute ? "Describe the app in plain language, connect your model key, then save." : null,
  );
  const [session, setSession] = useState<SessionResponse>({ authenticated: false, user: null });
  const [lastSavedState, setLastSavedState] = useState(
    JSON.stringify({ name: "Untitled app", description: DEFAULT_DESCRIPTION, workspace: serializeWorkspaceDraft(DEFAULT_WORKSPACE) }),
  );

  useEffect(() => {
    let active = true;
    requestJson<SessionResponse>("/api/auth/session")
      .then((p) => { if (active) setSession(p); })
      .catch(() => { if (active) setSession({ authenticated: false, user: null }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isNewRoute) return;
    let active = true;
    requestJson<ProjectResponse>(`/api/projects/${id}`)
      .then((p) => {
        if (!active) return;
        const next = parseWorkspaceDraft(p.project.code);
        setProjectId(p.project.id);
        setProjectName(p.project.name);
        setProjectDescription(p.project.description);
        setWorkspace(next);
        setLastSavedState(JSON.stringify({ name: p.project.name, description: p.project.description, workspace: serializeWorkspaceDraft(next) }));
        setNotice(null);
        setError(null);
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Unable to load project."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, isNewRoute]);

  const flashSaved = useCallback(() => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }, []);

  const handleSave = useCallback(async () => {
    if (!session.authenticated) {
      router.push(`/onboarding?mode=signin&redirectTo=${encodeURIComponent("/builder/new")}&reason=${encodeURIComponent("Sign in to save this draft.")}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const code = serializeWorkspaceDraft(workspace);
      if (!projectId) {
        const p = await requestJson<ProjectResponse>("/api/projects", {
          method: "POST",
          body: JSON.stringify({ name: projectName, description: projectDescription, code, status: "draft", visibility: "private" }),
        });
        setProjectId(p.project.id);
        setLastSavedState(JSON.stringify({ name: projectName, description: projectDescription, workspace: code }));
        setNotice("Draft created. Keep refining or publish when ready.");
        router.replace(`/builder/${p.project.id}`);
      } else {
        await requestJson<ProjectResponse>(`/api/projects/${projectId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: projectName, description: projectDescription, code }),
        });
        setLastSavedState(JSON.stringify({ name: projectName, description: projectDescription, workspace: code }));
        setNotice("All settings saved.");
      }
      flashSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to save.";
      if (msg.toLowerCase().includes("sign in")) {
        router.push(`/onboarding?mode=signin&redirectTo=${encodeURIComponent("/builder/new")}`);
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [projectDescription, projectId, projectName, router, session.authenticated, workspace, flashSaved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); void handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const hasUnsavedChanges =
    JSON.stringify({ name: projectName, description: projectDescription, workspace: serializeWorkspaceDraft(workspace) }) !== lastSavedState;

  if (!isNewRoute && !loading && error && !projectId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <p className="text-sm font-medium text-black">{error}</p>
        <Link href="/dashboard" className="text-sm border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">

      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-[#eaeaea] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 h-12">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href="/dashboard" className="text-sm font-semibold text-black hover:opacity-60 transition-opacity duration-150 shrink-0">
              Kyro
            </Link>
            <span className="text-[#ccc] shrink-0">/</span>
            {editingName ? (
              <input
                autoFocus
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                className="w-44 border-b border-black bg-transparent pb-px text-sm text-black outline-none"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="truncate text-sm text-black hover:text-[#666] transition-colors duration-150 max-w-[180px]"
                title="Rename"
              >
                {projectName}
              </button>
            )}
            {saved ? (
              <span className="text-[11px] text-[#10B981] font-mono shrink-0">Saved</span>
            ) : hasUnsavedChanges ? (
              <span className="text-[11px] text-[#666] font-mono shrink-0">Unsaved</span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {!session.authenticated && (
              <Link
                href={`/onboarding?mode=signin&redirectTo=${encodeURIComponent("/builder/new")}`}
                className="hidden md:inline-flex items-center rounded-md border border-[#eaeaea] px-3 py-1.5 text-xs text-[#666] hover:border-black hover:text-black transition-colors duration-150"
              >
                Sign in to save
              </Link>
            )}
            <button
              onClick={() => void handleSave()}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors duration-150 ${
                saved ? "border-[#10B981] text-[#10B981]" : "border-[#eaeaea] text-[#666] hover:border-black hover:text-black"
              }`}
            >
              {saving ? "Saving..." : saved ? "Saved" : "Save draft"}
            </button>
            {projectId ? (
              <Link
                href={`/publish?projectId=${projectId}`}
                className="rounded-md border border-[#eaeaea] px-3 py-1.5 text-xs text-[#666] hover:border-black hover:text-black transition-colors duration-150"
              >
                Publish
              </Link>
            ) : (
              <button
                onClick={() => setNotice("Save this draft first, then publishing unlocks.")}
                className="rounded-md border border-[#eaeaea] px-3 py-1.5 text-xs text-[#ccc] cursor-not-allowed"
              >
                Publish
              </button>
            )}
            <button
              onClick={() => setNotice("Export is coming soon.")}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4F46E5] transition-colors duration-150"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Notice / error banner */}
      {(notice || error) && (
        <div className={`border-b px-5 py-2.5 text-xs font-mono ${error ? "border-red-100 bg-red-50 text-red-600" : "border-[#eaeaea] bg-[#fafafa] text-[#666]"}`}>
          {error ?? notice}
          <button className="ml-4 hover:text-black transition-colors duration-150" onClick={() => { setNotice(null); setError(null); }}>
            dismiss ×
          </button>
        </div>
      )}

      <div className="mx-auto grid max-w-[1440px] gap-5 px-5 py-6 lg:grid-cols-[260px_minmax(0,1fr)_300px]">

        {/* ── Left sidebar: Connection + Behavior ── */}
        <aside className="space-y-3">

          {/* Connection */}
          <section className="rounded-xl border border-[#eaeaea] bg-white p-4">
            <p className="mb-4 text-xs font-mono text-[#666] uppercase tracking-widest">Connection</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-black">Provider</label>
                <select
                  value={workspace.apiProvider}
                  onChange={(e) =>
                    setWorkspace((cur) => ({
                      ...cur,
                      apiProvider: e.target.value === "anthropic" ? "anthropic" : "openai",
                      model: e.target.value === "anthropic" ? "claude-3-7-sonnet" : "gpt-5.1",
                    }))
                  }
                  className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm text-black outline-none focus:border-black transition-colors duration-150 cursor-pointer"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-black">API key</label>
                <input
                  type="text"
                  value={workspace.apiKey}
                  onChange={(e) => setWorkspace((cur) => ({ ...cur, apiKey: e.target.value }))}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={workspace.apiProvider === "anthropic" ? "sk-ant-..." : "sk-proj-..."}
                  className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm text-black placeholder:text-[#999] outline-none focus:border-black transition-colors duration-150 font-mono"
                />
                <p className="mt-1.5 text-[11px] text-[#999]">Bring your own key. Kyro stores the setup, not a hosted plan.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-black">Model</label>
                <input
                  value={workspace.model}
                  onChange={(e) => setWorkspace((cur) => ({ ...cur, model: e.target.value }))}
                  placeholder={workspace.apiProvider === "anthropic" ? "claude-3-7-sonnet" : "gpt-5.1"}
                  className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm text-black placeholder:text-[#999] outline-none focus:border-black transition-colors duration-150 font-mono"
                />
              </div>

              {/* Key status indicator */}
              <div className={`flex items-center gap-2 rounded-md border px-3 py-2 ${workspace.apiKey ? "border-[#eaeaea] bg-[#fafafa]" : "border-dashed border-[#eaeaea]"}`}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${workspace.apiKey ? "bg-[#10B981]" : "bg-[#eaeaea]"}`} />
                <span className="text-[11px] font-mono text-[#666]">
                  {workspace.apiKey ? "Key connected" : "No key — add one above"}
                </span>
              </div>
            </div>
          </section>

          {/* Behavior */}
          <section className="rounded-xl border border-[#eaeaea] bg-white p-4">
            <p className="mb-4 text-xs font-mono text-[#666] uppercase tracking-widest">Behavior</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium text-black">Voice</label>
                <div className="space-y-1.5">
                  {VOICE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setWorkspace((cur) => ({ ...cur, voice: opt.value }))}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ${
                        workspace.voice === opt.value
                          ? "border-black bg-black text-white"
                          : "border-[#eaeaea] hover:border-black"
                      }`}
                    >
                      <span className={`block text-xs font-medium ${workspace.voice === opt.value ? "text-white" : "text-black"}`}>
                        {opt.label}
                      </span>
                      <span className={`block text-[11px] mt-0.5 ${workspace.voice === opt.value ? "text-white/60" : "text-[#666]"}`}>
                        {opt.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-black">Surface</label>
                <div className="space-y-1.5">
                  {SURFACE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setWorkspace((cur) => ({ ...cur, appSurface: opt.value }))}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ${
                        workspace.appSurface === opt.value
                          ? "border-black bg-black text-white"
                          : "border-[#eaeaea] hover:border-black"
                      }`}
                    >
                      <span className={`block text-xs font-medium ${workspace.appSurface === opt.value ? "text-white" : "text-black"}`}>
                        {opt.label}
                      </span>
                      <span className={`block text-[11px] mt-0.5 ${workspace.appSurface === opt.value ? "text-white/60" : "text-[#666]"}`}>
                        {opt.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </aside>

        {/* ── Main: Prompt workspace ── */}
        <main className="space-y-4">

          {/* Header */}
          <div className="rounded-xl border border-[#eaeaea] bg-[#fafafa] px-6 py-8">
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Builder</p>
            <h1 className="text-2xl font-semibold tracking-tight text-black mb-1 leading-tight">
              {projectName || "Untitled app"}
            </h1>
            <p className="text-sm text-[#666]">
              Shape this app in plain language. Connect a model key, then publish.
            </p>
          </div>

          {/* Prompt */}
          <section className="rounded-xl border border-[#eaeaea] bg-white p-5">
            <label className="mb-3 block text-xs font-mono text-[#666] uppercase tracking-widest">
              What should this app do?
            </label>
            <textarea
              value={workspace.prompt}
              onChange={(e) => setWorkspace((cur) => ({ ...cur, prompt: e.target.value }))}
              placeholder="Describe the app, who it helps, and what a strong answer looks like."
              rows={7}
              className="w-full resize-none bg-white text-sm leading-7 text-black outline-none placeholder:text-[#999]"
            />
            <div className="mt-4 flex items-center justify-between border-t border-[#eaeaea] pt-3">
              <div className="flex gap-2 flex-wrap">
                {PROMPT_STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setWorkspace((cur) => ({ ...cur, prompt: s }))}
                    className="text-[11px] border border-[#eaeaea] rounded-full px-2.5 py-1 text-[#666] hover:border-black hover:text-black transition-colors duration-150 font-mono leading-none"
                  >
                    {s.split(" ").slice(0, 4).join(" ")}...
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className="text-[11px] font-mono text-[#999]">{workspace.model}</span>
                <span className="text-[#eaeaea]">·</span>
                <span className="text-[11px] font-mono text-[#999]">{workspace.appSurface}</span>
              </div>
            </div>
          </section>

          {/* 2-col details */}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-[#eaeaea] bg-white p-5">
              <label className="mb-2 block text-xs font-mono text-[#666] uppercase tracking-widest">Opening message</label>
              <textarea
                value={workspace.firstMessage}
                onChange={(e) => setWorkspace((cur) => ({ ...cur, firstMessage: e.target.value }))}
                placeholder="What users see when they open the app."
                rows={5}
                className="w-full resize-none bg-white text-sm leading-7 text-black outline-none placeholder:text-[#999]"
              />
            </section>

            <section className="rounded-xl border border-[#eaeaea] bg-white p-5">
              <label className="mb-2 block text-xs font-mono text-[#666] uppercase tracking-widest">One-line pitch</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Summarize the app in one sentence."
                rows={5}
                className="w-full resize-none bg-white text-sm leading-7 text-black outline-none placeholder:text-[#999]"
              />
            </section>

            <section className="rounded-xl border border-[#eaeaea] bg-white p-5">
              <label className="mb-2 block text-xs font-mono text-[#666] uppercase tracking-widest">Knowledge & context</label>
              <textarea
                value={workspace.knowledge}
                onChange={(e) => setWorkspace((cur) => ({ ...cur, knowledge: e.target.value }))}
                placeholder="Paste docs, team rules, product facts, or example answers."
                rows={6}
                className="w-full resize-none bg-white text-sm leading-7 text-black outline-none placeholder:text-[#999]"
              />
            </section>

            <section className="rounded-xl border border-[#eaeaea] bg-white p-5">
              <label className="mb-2 block text-xs font-mono text-[#666] uppercase tracking-widest">Guardrails</label>
              <textarea
                value={workspace.guardrails}
                onChange={(e) => setWorkspace((cur) => ({ ...cur, guardrails: e.target.value }))}
                placeholder="Behavior limits, escalation rules, or refusal criteria."
                rows={6}
                className="w-full resize-none bg-white text-sm leading-7 text-black outline-none placeholder:text-[#999]"
              />
            </section>
          </div>

          {/* Bottom save bar */}
          <div className="flex items-center justify-between rounded-xl border border-[#eaeaea] bg-[#fafafa] px-5 py-3.5">
            <span className="text-xs text-[#666] font-mono">⌘S to save</span>
            <div className="flex gap-2">
              <button
                onClick={() => void handleSave()}
                disabled={saving || !hasUnsavedChanges}
                className="text-xs border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save draft"}
              </button>
              {projectId && (
                <Link
                  href={`/publish?projectId=${projectId}`}
                  className="text-xs bg-black text-white px-4 py-2 rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
                >
                  Publish →
                </Link>
              )}
            </div>
          </div>
        </main>

        {/* ── Right sidebar: Preview ── */}
        <aside className="space-y-3">

          {/* Launch preview */}
          <section className="rounded-xl border border-[#eaeaea] bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono text-[#666] uppercase tracking-widest">Preview</p>
              <span className={`text-[11px] font-mono ${hasUnsavedChanges ? "text-[#666]" : "text-[#10B981]"}`}>
                {hasUnsavedChanges ? "unsaved" : "ready"}
              </span>
            </div>

            <div className="rounded-lg border border-[#eaeaea] bg-[#fafafa] p-4">
              <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-[#eaeaea]">
                <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {projectName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-black truncate">{projectName}</p>
                  <p className="text-[11px] text-[#666] truncate">{projectDescription}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { label: "Prompt", value: summarizePrompt(workspace.prompt) },
                  { label: "Model", value: workspace.model || "Not set" },
                  { label: "Provider", value: workspace.apiProvider === "anthropic" ? "Anthropic" : "OpenAI" },
                  { label: "API key", value: workspace.apiKey ? "Connected" : "Missing" },
                  { label: "Surface", value: workspace.appSurface },
                  { label: "Voice", value: workspace.voice },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3">
                    <span className="text-[#666] shrink-0">{row.label}</span>
                    <span className={`text-right font-mono text-[11px] ${row.label === "API key" && !workspace.apiKey ? "text-red-400" : "text-black"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Checklist */}
          <section className="rounded-xl border border-[#eaeaea] bg-white p-4">
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-4">Before publishing</p>
            <div className="space-y-2">
              {[
                { label: "Add API key", done: !!workspace.apiKey, detail: "Users need a live model connection." },
                { label: "Write a prompt", done: workspace.prompt.trim().length > 20, detail: "Be specific about the job it does." },
                { label: "Set opening message", done: workspace.firstMessage.trim().length > 5, detail: "Tell users what to ask first." },
              ].map((item) => (
                <div key={item.label} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${item.done ? "border-[#eaeaea] bg-[#fafafa]" : "border-dashed border-[#eaeaea]"}`}>
                  <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${item.done ? "border-black bg-black" : "border-[#ccc]"}`}>
                    {item.done && (
                      <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
                        <path d="M1 2.5L2.5 4L5 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-black leading-none mb-0.5">{item.label}</p>
                    <p className="text-[11px] text-[#666]">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/pricing" className="mt-4 inline-flex items-center text-xs text-[#4F46E5] hover:text-black transition-colors duration-150 font-mono">
              View pricing →
            </Link>
          </section>

          {/* About drafts */}
          <section className="rounded-xl border border-[#eaeaea] bg-[#fafafa] p-4">
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-2">Drafts</p>
            <p className="text-xs text-[#666] leading-relaxed">
              Kyro saves the app name, pitch, prompt, opening message, provider, model, and notes. Shape behavior here first — code comes later.
            </p>
          </section>
        </aside>

      </div>
    </div>
  );
}
