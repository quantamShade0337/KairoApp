"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/http-client";
import type { PublicProject } from "@/lib/backend/types";

const STEPS = [
  { id: 1, title: "Name it", description: "Give the app a name and a title." },
  { id: 2, title: "Tell the AI", description: "Describe what it should build in chat form." },
  { id: 3, title: "Preview & refine", description: "Click elements in the preview and leave notes." },
] as const;

type ProjectResponse = { project: PublicProject };
type SessionResponse = { authenticated: boolean; user: { name: string; handle: string } | null };
type ApiProvider = "openai" | "anthropic";
type VoicePreset = "concise" | "friendly" | "expert";
type Step = 1 | 2 | 3;
type ChatRole = "user" | "assistant";
type PreviewElementId = "hero" | "prompt" | "response" | "sidebar" | "cta";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

type PreviewComment = {
  id: string;
  elementId: PreviewElementId;
  note: string;
  createdAt: string;
};

type WorkspaceDraft = {
  version: "kyro-workspace-v2";
  prompt: string;
  firstMessage: string;
  apiProvider: ApiProvider;
  apiKey: string;
  model: string;
  voice: VoicePreset;
  appSurface: "chat" | "assistant" | "agent";
  knowledge: string;
  guardrails: string;
  messages: ChatMessage[];
  comments: PreviewComment[];
  selectedPreviewId: PreviewElementId;
};

const DEFAULT_WORKSPACE: WorkspaceDraft = {
  version: "kyro-workspace-v2",
  prompt: "",
  firstMessage: "I’m ready. Tell me what this app should do, who it helps, and what the first usable version should feel like.",
  apiProvider: "openai",
  apiKey: "",
  model: "gpt-5.1",
  voice: "friendly",
  appSurface: "chat",
  knowledge: "",
  guardrails: "Do not fabricate facts. Ask a follow-up when key details are missing.",
  messages: [
    {
      id: "seed-assistant",
      role: "assistant",
      content: "I’m ready. Tell me what this app should do, who it helps, and what the first usable version should feel like.",
      createdAt: new Date().toISOString(),
    },
  ],
  comments: [],
  selectedPreviewId: "hero",
};

const PROMPT_STARTERS = [
  "A support copilot that answers from our docs and escalates billing issues.",
  "A recruiting assistant that qualifies applicants before a human interview.",
  "A sales demo bot that captures leads and explains pricing clearly.",
  "A private team assistant that turns notes into next steps and summaries.",
];

const PREVIEW_ELEMENTS: Array<{
  id: PreviewElementId;
  title: string;
  detail: string;
}> = [
  { id: "hero", title: "Hero", detail: "Headline, title, and the first thing users see." },
  { id: "prompt", title: "Prompt box", detail: "Where users ask the app what to do." },
  { id: "response", title: "AI response", detail: "The generated answer or output area." },
  { id: "sidebar", title: "Sidebar", detail: "Model controls, context, and supporting info." },
  { id: "cta", title: "Primary action", detail: "The main button users click to continue." },
];

function nowIso() {
  return new Date().toISOString();
}

function parseWorkspaceDraft(serialized: string): WorkspaceDraft {
  try {
    const parsed = JSON.parse(serialized) as Partial<WorkspaceDraft> & {
      version?: string;
      prompt?: string;
      firstMessage?: string;
      apiProvider?: ApiProvider;
      apiKey?: string;
      model?: string;
      voice?: VoicePreset;
      appSurface?: "chat" | "assistant" | "agent";
      knowledge?: string;
      guardrails?: string;
      comments?: PreviewComment[];
      selectedPreviewId?: PreviewElementId;
      messages?: ChatMessage[];
    };

    if (parsed.version === "kyro-workspace-v2") {
      return {
        version: "kyro-workspace-v2",
        prompt: parsed.prompt ?? "",
        firstMessage: parsed.firstMessage ?? DEFAULT_WORKSPACE.firstMessage,
        apiProvider: parsed.apiProvider === "anthropic" ? "anthropic" : "openai",
        apiKey: parsed.apiKey ?? "",
        model: parsed.model ?? (parsed.apiProvider === "anthropic" ? "claude-3-7-sonnet" : "gpt-5.1"),
        voice: parsed.voice === "concise" || parsed.voice === "expert" ? parsed.voice : "friendly",
        appSurface: parsed.appSurface === "assistant" || parsed.appSurface === "agent" ? parsed.appSurface : "chat",
        knowledge: parsed.knowledge ?? "",
        guardrails: parsed.guardrails ?? DEFAULT_WORKSPACE.guardrails,
        messages: parsed.messages ?? DEFAULT_WORKSPACE.messages,
        comments: parsed.comments ?? [],
        selectedPreviewId: parsed.selectedPreviewId ?? "hero",
      };
    }

    if (parsed.version === "kyro-workspace-v1") {
      const prompt = parsed.prompt ?? "";
      const firstMessage = parsed.firstMessage?.trim() || DEFAULT_WORKSPACE.firstMessage;

      return {
        version: "kyro-workspace-v2",
        prompt,
        firstMessage,
        apiProvider: parsed.apiProvider === "anthropic" ? "anthropic" : "openai",
        apiKey: parsed.apiKey ?? "",
        model: parsed.model ?? (parsed.apiProvider === "anthropic" ? "claude-3-7-sonnet" : "gpt-5.1"),
        voice: parsed.voice === "concise" || parsed.voice === "expert" ? parsed.voice : "friendly",
        appSurface: parsed.appSurface === "assistant" || parsed.appSurface === "agent" ? parsed.appSurface : "chat",
        knowledge: parsed.knowledge ?? "",
        guardrails: parsed.guardrails ?? DEFAULT_WORKSPACE.guardrails,
        messages: prompt
          ? [
              { id: "legacy-user", role: "user", content: prompt, createdAt: nowIso() },
              { id: "legacy-assistant", role: "assistant", content: firstMessage, createdAt: nowIso() },
            ]
          : DEFAULT_WORKSPACE.messages,
        comments: [],
        selectedPreviewId: "hero",
      };
    }
  } catch {
    // fall through to default draft
  }

  return {
    ...DEFAULT_WORKSPACE,
    prompt: serialized.trim(),
    messages: serialized.trim()
      ? [
          { id: "imported-user", role: "user", content: serialized.trim(), createdAt: nowIso() },
          { id: "imported-assistant", role: "assistant", content: "Imported from an older draft. Tell me what to change next.", createdAt: nowIso() },
        ]
      : DEFAULT_WORKSPACE.messages,
  };
}

function serializeWorkspaceDraft(workspace: WorkspaceDraft) {
  return JSON.stringify(workspace, null, 2);
}

function summarizePrompt(prompt: string) {
  const compact = prompt.trim().replace(/\s+/g, " ");
  if (!compact) return "No prompt yet.";
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}

function createAssistantReply(prompt: string, title: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes("support")) {
    return `Perfect — I’ll shape ${title} into a support-first flow with clear escalation, friendly tone, and fast answers.`;
  }
  if (lower.includes("lead") || lower.includes("sales")) {
    return `Got it — ${title} should feel polished, conversion-focused, and lightweight so users can act fast.`;
  }
  if (lower.includes("internal") || lower.includes("team")) {
    return `Understood — I’ll make ${title} feel private, focused, and useful for teams that need quick outcomes.`;
  }
  return `Nice — I can turn that into ${title} with a clean interface, strong defaults, and a very obvious first action.`;
}

function relativeCommentTime(iso: string) {
  const diffMinutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const hours = Math.floor(diffMinutes / 60);
  return `${hours}h ago`;
}

export default function BuilderWizard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const isNewRoute = projectId === "new";
  const [projectIdState, setProjectIdState] = useState<string | null>(isNewRoute ? null : projectId);
  const activeBuilderPath = projectIdState ? `/builder/${projectIdState}` : "/builder/new";
  const [step, setStep] = useState<Step>(isNewRoute ? 1 : 2);
  const [workspace, setWorkspace] = useState<WorkspaceDraft>(DEFAULT_WORKSPACE);
  const [projectName, setProjectName] = useState("Untitled app");
  const [projectTitle, setProjectTitle] = useState("A focused app built with AI.");
  const [editingName, setEditingName] = useState(isNewRoute);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNewRoute);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    isNewRoute ? "Start with the app name and title, then move through the three steps." : null,
  );
  const [session, setSession] = useState<SessionResponse>({ authenticated: false, user: null });
  const [composer, setComposer] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [publishVisibility, setPublishVisibility] = useState<"private" | "public">("public");
  const [lastSavedState, setLastSavedState] = useState(
    JSON.stringify({ name: "Untitled app", title: "A focused app built with AI.", workspace: serializeWorkspaceDraft(DEFAULT_WORKSPACE) }),
  );

  useEffect(() => {
    let active = true;
    requestJson<SessionResponse>("/api/auth/session")
      .then((payload) => {
        if (active) {
          setSession(payload);
        }
      })
      .catch(() => {
        if (active) {
          setSession({ authenticated: false, user: null });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const routeProjectId = isNewRoute ? null : projectId;
    if (!routeProjectId) {
      return;
    }

    let active = true;
    requestJson<ProjectResponse>(`/api/projects/${routeProjectId}`)
      .then((payload) => {
        if (!active) return;
        const nextWorkspace = parseWorkspaceDraft(payload.project.code);
        setProjectIdState(payload.project.id);
        setProjectName(payload.project.name || "Untitled app");
        setProjectTitle(payload.project.description || "A focused app built with AI.");
        setWorkspace(nextWorkspace);
        setComposer(nextWorkspace.prompt);
        setLastSavedState(
          JSON.stringify({
            name: payload.project.name,
            title: payload.project.description,
            workspace: serializeWorkspaceDraft(nextWorkspace),
          }),
        );
        setStep(2);
        setNotice(null);
        setError(null);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load project.");
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
  }, [isNewRoute, projectId]);

  const flashSaved = useCallback(() => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }, []);

  const persistDraft = useCallback(async () => {
    if (!session.authenticated) {
      router.push(
        `/onboarding?mode=signin&redirectTo=${encodeURIComponent(activeBuilderPath)}&reason=${encodeURIComponent(
          "Sign in to save this draft.",
        )}`,
      );
      return null;
    }

    setSaving(true);
    setError(null);

    try {
      const code = serializeWorkspaceDraft(workspace);

      if (!projectIdState) {
        const created = await requestJson<ProjectResponse>("/api/projects", {
          method: "POST",
          body: JSON.stringify({
            name: projectName,
            description: projectTitle,
            code,
            status: "draft",
            visibility: "private",
            sourceKind: "draft",
            sourceLabel: projectName,
          }),
        });

        setProjectIdState(created.project.id);
        setLastSavedState(JSON.stringify({ name: projectName, title: projectTitle, workspace: code }));
        setNotice("Draft created. Work on it later or publish when ready.");
        router.replace(`/builder/${created.project.id}`);
        flashSaved();
        return created.project.id;
      }

      await requestJson<ProjectResponse>(`/api/projects/${projectIdState}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: projectName,
          description: projectTitle,
          code,
        }),
      });

      setLastSavedState(JSON.stringify({ name: projectName, title: projectTitle, workspace: code }));
      setNotice("Draft saved.");
      flashSaved();
      return projectIdState;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to save.";
      if (message.toLowerCase().includes("sign in")) {
        router.push(`/onboarding?mode=signin&redirectTo=${encodeURIComponent(activeBuilderPath)}`);
        return null;
      }
      setError(message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [activeBuilderPath, flashSaved, projectIdState, projectName, projectTitle, router, session.authenticated, workspace]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        void persistDraft();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [persistDraft]);

  const hasUnsavedChanges =
    JSON.stringify({ name: projectName, title: projectTitle, workspace: serializeWorkspaceDraft(workspace) }) !== lastSavedState;

  const handleSendPrompt = useCallback(() => {
    const message = composer.trim();
    if (!message) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: nowIso(),
    };

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: createAssistantReply(message, projectName || "this app"),
      createdAt: nowIso(),
    };

    setWorkspace((current) => ({
      ...current,
      prompt: message,
      messages: [...current.messages, userMessage, assistantMessage],
    }));
    setComposer("");
    setNotice("AI brief updated.");
  }, [composer, projectName]);

  const handleAddComment = useCallback(() => {
    const note = commentDraft.trim();
    if (!note) {
      return;
    }

    setWorkspace((current) => ({
      ...current,
      comments: [
        ...current.comments,
        {
          id: `comment-${Date.now()}`,
          elementId: current.selectedPreviewId,
          note,
          createdAt: nowIso(),
        },
      ],
    }));
    setCommentDraft("");
    setNotice("Comment added to the preview.");
  }, [commentDraft]);

  async function handlePublish(selectedMode: "private" | "public") {
    const savedProjectId = await persistDraft();
    if (!savedProjectId) {
      return;
    }

    router.push(`/publish?projectId=${savedProjectId}&visibility=${selectedMode}`);
  }

  const selectedPreviewElement = PREVIEW_ELEMENTS.find((element) => element.id === workspace.selectedPreviewId) ?? PREVIEW_ELEMENTS[0];
  const selectedComments = workspace.comments.filter((comment) => comment.elementId === workspace.selectedPreviewId);

  if (!isNewRoute && !loading && error && !projectIdState) {
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
            <span className="text-[#ccc] shrink-0">/</span>
            <span className="truncate text-sm text-[#666] max-w-[220px]">{projectTitle}</span>
            {saved ? (
              <span className="text-[11px] text-[#10B981] font-mono shrink-0">Saved</span>
            ) : hasUnsavedChanges ? (
              <span className="text-[11px] text-[#666] font-mono shrink-0">Unsaved</span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => void persistDraft()}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors duration-150 ${
                saved ? "border-[#10B981] text-[#10B981]" : "border-[#eaeaea] text-[#666] hover:border-black hover:text-black"
              }`}
            >
              {saving ? "Saving..." : saved ? "Saved" : "Save draft"}
            </button>
            {projectIdState ? (
              <Link
                href={`/publish?projectId=${projectIdState}&visibility=${publishVisibility}`}
                className="rounded-md border border-[#eaeaea] px-3 py-1.5 text-xs text-[#666] hover:border-black hover:text-black transition-colors duration-150"
              >
                Publish
              </Link>
            ) : (
              <button
                onClick={() => setNotice("Save the draft first to unlock publishing.")}
                className="rounded-md border border-[#eaeaea] px-3 py-1.5 text-xs text-[#ccc] cursor-not-allowed"
              >
                Publish
              </button>
            )}
            <button
              onClick={() => void persistDraft()}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4F46E5] transition-colors duration-150"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {(notice || error) && (
        <div className={`border-b px-5 py-2.5 text-xs font-mono ${error ? "border-red-100 bg-red-50 text-red-600" : "border-[#eaeaea] bg-[#fafafa] text-[#666]"}`}>
          {error ?? notice}
          <button className="ml-4 hover:text-black transition-colors duration-150" onClick={() => { setNotice(null); setError(null); }}>
            dismiss ×
          </button>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] px-5 py-6">
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          {STEPS.map((stepItem) => (
            <button
              key={stepItem.id}
              onClick={() => setStep(stepItem.id)}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-left transition-colors duration-150 ${
                step === stepItem.id ? "border-black bg-black text-white" : "border-[#eaeaea] bg-white hover:border-black"
              }`}
            >
              <span className="text-[11px] font-mono">0{stepItem.id}</span>
              <span>
                <span className="block text-xs font-medium leading-none">{stepItem.title}</span>
                <span className={`block mt-0.5 text-[11px] ${step === stepItem.id ? "text-white/70" : "text-[#666]"}`}>
                  {stepItem.description}
                </span>
              </span>
            </button>
          ))}
        </div>

        {step === 1 && (
          <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border border-[#eaeaea] bg-white p-6">
              <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Step 1</p>
              <h1 className="text-3xl font-semibold tracking-tight text-black mb-2">Name your app and set its title</h1>
              <p className="text-sm text-[#666] max-w-xl">Give the project a name and a title that users will remember. This is the foundation of the builder flow.</p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-black">App name</label>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Resume Builder"
                    className="w-full rounded-md border border-[#eaeaea] px-3 py-2 text-sm text-black placeholder:text-[#999] outline-none focus:border-black transition-colors duration-150"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-black">Title</label>
                  <input
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Create a clean resume in minutes"
                    className="w-full rounded-md border border-[#eaeaea] px-3 py-2 text-sm text-black placeholder:text-[#999] outline-none focus:border-black transition-colors duration-150"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-[#eaeaea] bg-[#fafafa] p-4">
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-2">Quick view</p>
                <p className="text-sm font-medium text-black">{projectName || "Untitled app"}</p>
                <p className="mt-1 text-xs text-[#666]">{projectTitle || "A focused app built with AI."}</p>
              </div>

              <div className="mt-8 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setStep(2)}
                  className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4F46E5] transition-colors duration-150"
                >
                  Continue
                </button>
                <button
                  onClick={() => void persistDraft()}
                  className="rounded-md border border-[#eaeaea] px-5 py-2.5 text-sm text-black hover:border-black transition-colors duration-150"
                >
                  Save draft
                </button>
              </div>
            </div>

            <aside className="rounded-2xl border border-[#eaeaea] bg-[#fafafa] p-6">
              <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Plan</p>
              <div className="space-y-3">
                {[
                  "Give the app a clear name and title.",
                  "Describe the app in chat like Claude.",
                  "Preview it, click elements, and leave notes.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-black shrink-0" />
                    <p className="text-sm text-[#666]">{item}</p>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        )}

        {step === 2 && (
          <section className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="rounded-2xl border border-[#eaeaea] bg-white p-6 flex flex-col min-h-[640px]">
              <div className="mb-6">
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Step 2</p>
                <h1 className="text-3xl font-semibold tracking-tight text-black leading-tight">What will you work on, {projectName || "this app"}?</h1>
                <p className="mt-2 text-sm text-[#666] max-w-2xl">Tell the AI what you want. Keep it conversational — like Claude — and the conversation becomes the app brief.</p>
              </div>

              <div className="flex-1 rounded-2xl border border-[#eaeaea] bg-[#fafafa] p-4 overflow-y-auto">
                <div className="space-y-4">
                  {workspace.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === "user" ? "bg-black text-white" : "border border-[#eaeaea] bg-white text-black"}`}>
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#eaeaea] bg-white p-4">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Tell the AI what to do. Describe the job, the users, and the result you want."
                  rows={5}
                  className="w-full resize-none bg-transparent text-sm leading-7 text-black outline-none placeholder:text-[#999]"
                />
                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap border-t border-[#eaeaea] pt-3">
                  <div className="flex gap-2 flex-wrap">
                    {PROMPT_STARTERS.map((starter) => (
                      <button
                        key={starter}
                        onClick={() => setComposer(starter)}
                        className="rounded-full border border-[#eaeaea] px-3 py-1.5 text-[11px] font-mono text-[#666] hover:border-black hover:text-black transition-colors duration-150"
                      >
                        {starter.split(" ").slice(0, 4).join(" ")}...
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-[#999]">{workspace.model}</span>
                    <span className="text-[#eaeaea]">·</span>
                    <span className="text-[11px] font-mono text-[#999]">{workspace.apiProvider === "anthropic" ? "Anthropic" : "OpenAI"}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <button onClick={handleSendPrompt} className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4F46E5] transition-colors duration-150">Send to AI</button>
                  <button onClick={() => void persistDraft()} className="rounded-md border border-[#eaeaea] px-4 py-2.5 text-sm text-black hover:border-black transition-colors duration-150">Save draft</button>
                  <button onClick={() => setStep(3)} className="rounded-md border border-[#eaeaea] px-4 py-2.5 text-sm text-[#666] hover:border-black hover:text-black transition-colors duration-150">Preview</button>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-[#eaeaea] bg-[#fafafa] p-4">
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-4">AI settings</p>
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
                    <p className="mt-1.5 text-[11px] text-[#999]">Bring your own key. Kyro stores the setup, not the secret on the page.</p>
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

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-black">Voice</label>
                    <div className="grid grid-cols-1 gap-2">
                      {(["friendly", "concise", "expert"] as VoicePreset[]).map((voice) => (
                        <button
                          key={voice}
                          onClick={() => setWorkspace((cur) => ({ ...cur, voice }))}
                          className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors duration-150 ${
                            workspace.voice === voice ? "border-black bg-black text-white" : "border-[#eaeaea] hover:border-black"
                          }`}
                        >
                          <span className="block font-medium capitalize">{voice}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#eaeaea] bg-white p-5">
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">What the AI sees</p>
                <p className="text-sm text-black">{summarizePrompt(workspace.prompt)}</p>
                <p className="mt-3 text-xs text-[#666]">Save drafts anytime. You can keep working later from the dashboard.</p>
              </div>
            </aside>
          </section>
        )}

        {step === 3 && (
          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-[#eaeaea] bg-white p-6 min-h-[680px]">
              <div className="mb-6">
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Step 3</p>
                <h1 className="text-3xl font-semibold tracking-tight text-black leading-tight">Preview and refine {projectName || "the app"}</h1>
                <p className="mt-2 text-sm text-[#666] max-w-2xl">Click any element in the preview, then leave a note to tell the AI what to change.</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
                <div className="rounded-2xl border border-[#eaeaea] bg-[#fafafa] p-4">
                  <div className="mb-4 flex items-center justify-between rounded-xl border border-[#eaeaea] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-black">{projectName || "Untitled app"}</p>
                      <p className="text-xs text-[#666]">{projectTitle || "A focused app built with AI."}</p>
                    </div>
                    <span className="text-[11px] font-mono text-[#10B981]">Live preview</span>
                  </div>

                  <div className="space-y-4">
                    {PREVIEW_ELEMENTS.map((element) => {
                      const selected = workspace.selectedPreviewId === element.id;
                      const commentCount = workspace.comments.filter((comment) => comment.elementId === element.id).length;

                      return (
                        <button
                          key={element.id}
                          type="button"
                          onClick={() => setWorkspace((current) => ({ ...current, selectedPreviewId: element.id }))}
                          className={`w-full rounded-2xl border p-4 text-left transition-all duration-150 ${
                            selected ? "border-black bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]" : "border-[#eaeaea] bg-white hover:border-black"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-black">{element.title}</p>
                              <p className="mt-1 text-xs text-[#666]">{element.detail}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-mono ${selected ? "bg-black text-white" : "bg-[#fafafa] text-[#666]"}`}>
                              {commentCount} note{commentCount === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
                            <div className="rounded-xl border border-dashed border-[#eaeaea] bg-[#fafafa] p-4">
                              {element.id === "hero" && (
                                <>
                                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#666] mb-2">Hero</p>
                                  <p className="text-2xl font-semibold tracking-tight text-black">Build faster with AI.</p>
                                  <p className="mt-2 text-sm text-[#666]">A clean landing area for {projectName || "your app"}.</p>
                                </>
                              )}
                              {element.id === "prompt" && (
                                <>
                                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#666] mb-2">Prompt box</p>
                                  <div className="rounded-xl border border-[#eaeaea] bg-white p-3 text-sm text-[#666]">
                                    Ask the app to draft, rewrite, summarize, or generate.
                                  </div>
                                </>
                              )}
                              {element.id === "response" && (
                                <>
                                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#666] mb-2">Response</p>
                                  <div className="space-y-2 rounded-xl border border-[#eaeaea] bg-white p-3 text-sm text-[#666]">
                                    <div className="h-2 w-1/2 rounded-full bg-[#eaeaea]" />
                                    <div className="h-2 w-5/6 rounded-full bg-[#eaeaea]" />
                                    <div className="h-2 w-2/3 rounded-full bg-[#eaeaea]" />
                                  </div>
                                </>
                              )}
                              {element.id === "sidebar" && (
                                <>
                                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#666] mb-2">Context rail</p>
                                  <div className="space-y-2 text-sm text-[#666]">
                                    <div className="rounded-lg border border-[#eaeaea] bg-white px-3 py-2">Model: {workspace.model}</div>
                                    <div className="rounded-lg border border-[#eaeaea] bg-white px-3 py-2">Voice: {workspace.voice}</div>
                                  </div>
                                </>
                              )}
                              {element.id === "cta" && (
                                <>
                                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#666] mb-2">Primary action</p>
                                  <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">Continue</button>
                                </>
                              )}
                            </div>

                            <div className="rounded-xl border border-[#eaeaea] bg-white p-3 text-xs text-[#666]">
                              <p className="font-medium text-black">Preview hint</p>
                              <p className="mt-1 leading-relaxed">Click this section, then describe changes in the comment panel.</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#eaeaea] bg-[#fafafa] p-4">
                    <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Selected element</p>
                    <p className="text-sm font-medium text-black">{selectedPreviewElement.title}</p>
                    <p className="mt-1 text-xs text-[#666]">{selectedPreviewElement.detail}</p>
                    <div className="mt-4 rounded-xl border border-[#eaeaea] bg-white p-3 text-xs text-[#666]">
                      {selectedComments.length > 0 ? (
                        <div className="space-y-2">
                          {selectedComments.map((comment) => (
                            <div key={comment.id} className="rounded-lg border border-[#eaeaea] p-2">
                              <p className="text-black">{comment.note}</p>
                              <p className="mt-1 text-[11px] font-mono text-[#999]">{relativeCommentTime(comment.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No comments on this element yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#eaeaea] bg-white p-4">
                    <label className="text-xs font-medium text-black">Tell the AI what to change</label>
                    <textarea
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      rows={5}
                      placeholder={`For ${selectedPreviewElement.title.toLowerCase()}, make the copy clearer and the button bigger.`}
                      className="mt-2 w-full resize-none rounded-xl border border-[#eaeaea] px-3 py-2 text-sm text-black outline-none placeholder:text-[#999] focus:border-black transition-colors duration-150"
                    />
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {[
                        "Make this more prominent",
                        "Use friendlier copy",
                        "Add more spacing",
                        "Reduce the visual noise",
                      ].map((snippet) => (
                        <button
                          key={snippet}
                          onClick={() => setCommentDraft(snippet)}
                          className="rounded-full border border-[#eaeaea] px-3 py-1.5 text-[11px] font-mono text-[#666] hover:border-black hover:text-black transition-colors duration-150"
                        >
                          {snippet}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={handleAddComment} className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4F46E5] transition-colors duration-150">Add note</button>
                      <button onClick={() => void persistDraft()} className="rounded-md border border-[#eaeaea] px-4 py-2.5 text-sm text-black hover:border-black transition-colors duration-150">Save draft</button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#eaeaea] bg-[#fafafa] p-4">
                    <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Publish</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPublishVisibility("private")}
                        className={`rounded-xl border px-4 py-3 text-left transition-colors duration-150 ${publishVisibility === "private" ? "border-black bg-black text-white" : "border-[#eaeaea] hover:border-black"}`}
                      >
                        <p className="text-sm font-medium">Private</p>
                        <p className={`mt-1 text-[11px] ${publishVisibility === "private" ? "text-white/70" : "text-[#666]"}`}>Only you can access it.</p>
                      </button>
                      <button
                        onClick={() => setPublishVisibility("public")}
                        className={`rounded-xl border px-4 py-3 text-left transition-colors duration-150 ${publishVisibility === "public" ? "border-black bg-black text-white" : "border-[#eaeaea] hover:border-black"}`}
                      >
                        <p className="text-sm font-medium">Public</p>
                        <p className={`mt-1 text-[11px] ${publishVisibility === "public" ? "text-white/70" : "text-[#666]"}`}>Anyone can find it in the marketplace.</p>
                      </button>
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <button
                        onClick={() => void handlePublish("private")}
                        className="rounded-md border border-[#eaeaea] px-4 py-2.5 text-sm text-black hover:border-black transition-colors duration-150"
                      >
                        Publish privately
                      </button>
                      <button
                        onClick={() => void handlePublish("public")}
                        className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4F46E5] transition-colors duration-150"
                      >
                        Publish publicly
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
