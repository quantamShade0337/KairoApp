"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Input from "@/components/ui/Input";
import { requestJson } from "@/lib/http-client";
import type { PublicProject, PublicUser } from "@/lib/backend/types";

const SUGGESTED_TAGS = ["tools", "productivity", "dev", "AI", "utility", "writing", "design", "finance"];
const SOURCE_OPTIONS = [
  { id: "project", title: "Import from a project", body: "Publish something you already built in Kyro." },
  { id: "upload", title: "Upload an app folder", body: "Turn a folder upload into a publishable draft." },
  { id: "draft", title: "Use a draft", body: "Pick a draft from the builder and publish it when ready." },
] as const;
const PROOF_OPTIONS = [
  "Marketplace ticket",
  "Business/creator verification",
  "Portfolio or product link",
  "Uploaded document set",
] as const;

type SourceMode = (typeof SOURCE_OPTIONS)[number]["id"];

type SessionResponse = {
  authenticated: boolean;
  user: PublicUser | null;
};

type ProjectsResponse = {
  projects: PublicProject[];
};

type PublishResponse = {
  project: PublicProject;
  app: {
    id: string;
    visibility: "public" | "private";
  };
};

export default function PublishClientPage({ requestedProjectId }: { requestedProjectId: string | null }) {
  const router = useRouter();

  const [sessionUser, setSessionUser] = useState<PublicUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(requestedProjectId);
  const [sourceMode, setSourceMode] = useState<SourceMode>("project");
  const [importedFolderName, setImportedFolderName] = useState<string | null>(null);
  const [importedFileCount, setImportedFileCount] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [price, setPrice] = useState("0");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationProofLabel, setVerificationProofLabel] = useState<(typeof PROOF_OPTIONS)[number]>(
    "Marketplace ticket",
  );
  const [verificationProofDetails, setVerificationProofDetails] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [importingFolder, setImportingFolder] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function hydrateFromProject(project: PublicProject | null) {
    if (!project) {
      return;
    }

    setSelectedProjectId(project.id);
    setName(project.name);
    setDescription(project.description);
    setTags(project.tags.length > 0 ? project.tags : project.sourceAppId ? ["remix"] : []);
    setVisibility(project.visibility === "private" ? "private" : "public");
    setPrice("0");
  }

  useEffect(() => {
    let active = true;

    requestJson<SessionResponse>("/api/auth/session")
      .then((payload) => {
        if (!active) {
          return;
        }

        setSessionUser(payload.user);

        if (!payload.authenticated || !payload.user) {
          setSessionLoading(false);
          return;
        }

        if (payload.user.verificationStatus !== "verified") {
          setSessionLoading(false);
          return;
        }

        setProjectsLoading(true);
        return requestJson<ProjectsResponse>("/api/projects")
          .then((projectPayload) => {
            if (!active) {
              return;
            }

            setProjects(projectPayload.projects);

            const nextSelected =
              (requestedProjectId &&
                projectPayload.projects.find((project) => project.id === requestedProjectId)?.id) ??
              projectPayload.projects[0]?.id ??
              null;

            if (!nextSelected) {
              return;
            }

            const nextProject = projectPayload.projects.find((project) => project.id === nextSelected) ?? null;
            hydrateFromProject(nextProject);
          })
          .catch((requestError) => {
            if (active) {
              setError(requestError instanceof Error ? requestError.message : "Unable to load projects.");
            }
          })
          .finally(() => {
            if (active) {
              setProjectsLoading(false);
              setSessionLoading(false);
            }
          });
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load session.");
          setSessionLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [requestedProjectId]);

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !tags.includes(normalized) && tags.length < 6) {
      setTags((current) => [...current, normalized]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags((current) => current.filter((item) => item !== tag));

  async function handleRequestVerification() {
    if (!sessionUser || verifying) {
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const payload = await requestJson<{ profile: PublicUser }>("/api/verification/request", {
        method: "POST",
        body: JSON.stringify({
          message: verificationMessage,
          proofLabel: verificationProofLabel,
          proofDetails: verificationProofDetails,
        }),
      });

      setSessionUser(payload.profile);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit verification request.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleFolderUpload(files: FileList | null) {
    if (!sessionUser || !files || files.length === 0) {
      return;
    }

    setImportingFolder(true);
    setError(null);

    try {
      const firstRelativePath = files[0].webkitRelativePath || files[0].name;
      const folderName = firstRelativePath.includes("/") ? firstRelativePath.split("/")[0] : files[0].name.replace(/\.[^.]+$/, "");

      const payload = await requestJson<{ project: PublicProject }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: folderName || "Imported app",
          description: `Imported from ${files.length} file${files.length === 1 ? "" : "s"} in a folder upload.`,
          visibility: "private",
          status: "draft",
          sourceKind: "upload",
          sourceLabel: folderName || "Uploaded folder",
        }),
      });

      setProjects((current) => [payload.project, ...current.filter((project) => project.id !== payload.project.id)]);
      setImportedFolderName(folderName || "Uploaded folder");
      setImportedFileCount(files.length);
      setSourceMode("upload");
      hydrateFromProject(payload.project);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to import folder.");
    } finally {
      setImportingFolder(false);
    }
  }

  async function handlePublish() {
    if (!selectedProjectId || !name.trim() || !description.trim()) {
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const payload = await requestJson<PublishResponse>(`/api/projects/${selectedProjectId}/publish`, {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          tags,
          visibility,
          priceCents: Math.max(0, Math.round(Number(price || 0) * 100)),
          sourceKind: sourceMode,
          sourceLabel: importedFolderName ?? projects.find((project) => project.id === selectedProjectId)?.name ?? "",
        }),
      });

      setDone(true);
      window.setTimeout(() => {
        router.push(payload.app.visibility === "public" ? `/market/${payload.app.id}` : "/dashboard");
      }, 1200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to publish project.");
    } finally {
      setPublishing(false);
    }
  }

  const isVerified = sessionUser?.verificationStatus === "verified";

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-medium text-black">Published.</p>
        <p className="text-xs text-[#666]">Redirecting to your app...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 px-6">
        <div className="max-w-[560px] mx-auto">
          <div className="py-12 border-b border-[#eaeaea] mb-10">
            <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-3">Publish</p>
            <h1 className="text-3xl font-semibold tracking-tight text-black">Share your app</h1>
          </div>

          {sessionLoading || projectsLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-10 w-full rounded" />
              <div className="skeleton h-10 w-full rounded" />
              <div className="skeleton h-28 w-full rounded" />
            </div>
          ) : !sessionUser ? (
            <div className="border border-dashed border-[#eaeaea] rounded-xl py-14 text-center">
              <p className="text-sm font-medium text-black mb-2">Sign in to publish</p>
              <p className="text-xs text-[#666] mb-6">You need an account before you can upload apps to the marketplace.</p>
              <Link
                href={`/onboarding?mode=signin&redirectTo=${encodeURIComponent("/publish")}&reason=${encodeURIComponent(
                  "Sign in to publish apps to the marketplace.",
                )}`}
                className="inline-flex items-center text-xs border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
              >
                Go to sign in
              </Link>
            </div>
          ) : !isVerified ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-[#eaeaea] bg-[#fafafa] p-4">
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-2">Verification required</p>
                <p className="text-sm text-black">
                  Marketplace publishing is locked until the team reviews your verification ticket.
                </p>
                <p className="text-xs text-[#666] mt-2">
                  Status: {sessionUser.verificationStatus === "pending" ? "Pending review" : "Unverified"}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-black">What do you want to verify?</label>
                <textarea
                  value={verificationMessage}
                  onChange={(event) => setVerificationMessage(event.target.value)}
                  rows={4}
                  placeholder="Tell the team what you're building and why you should be allowed to publish."
                  className="w-full border border-[#eaeaea] rounded-md px-3 py-2 text-sm text-black placeholder:text-[#666] outline-none focus:border-black transition-colors duration-150 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROOF_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setVerificationProofLabel(option)}
                    className={`text-left border rounded-lg px-4 py-3 transition-colors duration-150 ${
                      verificationProofLabel === option ? "border-black bg-black text-white" : "border-[#eaeaea] hover:border-black"
                    }`}
                  >
                    <p className={`text-sm font-medium ${verificationProofLabel === option ? "text-white" : "text-black"}`}>
                      {option}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${verificationProofLabel === option ? "text-white/70" : "text-[#666]"}`}>
                      {option === "Marketplace ticket"
                        ? "Use a support ticket or review request."
                        : option === "Uploaded document set"
                          ? "Attach screenshots or proof links in the message."
                          : "Share a product, portfolio, or business link."}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-black">Proof details</label>
                <textarea
                  value={verificationProofDetails}
                  onChange={(event) => setVerificationProofDetails(event.target.value)}
                  rows={4}
                  placeholder="Add links, references, screenshots, folder names, or anything the team should review."
                  className="w-full border border-[#eaeaea] rounded-md px-3 py-2 text-sm text-black placeholder:text-[#666] outline-none focus:border-black transition-colors duration-150 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => void handleRequestVerification()}
                  disabled={verifying || !verificationMessage.trim() || !verificationProofDetails.trim()}
                  className="px-6 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {verifying ? "Submitting..." : "Submit verification ticket"}
                </button>
                <Link href="/settings" className="text-sm text-[#666] hover:text-black transition-colors duration-150">
                  Manage account
                </Link>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="border border-dashed border-[#eaeaea] rounded-xl py-14 text-center">
              <p className="text-sm font-medium text-black mb-2">No projects to publish</p>
              <p className="text-xs text-[#666] mb-6">Create something in the builder or upload a folder to start a draft.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  href="/builder/new"
                  className="inline-flex items-center text-xs border border-[#eaeaea] px-4 py-2 rounded-md text-[#666] hover:border-black hover:text-black transition-colors duration-150"
                >
                  Create project
                </Link>
                <button
                  onClick={() => setSourceMode("upload")}
                  className="inline-flex items-center text-xs bg-black text-white px-4 py-2 rounded-md hover:bg-[#4F46E5] transition-colors duration-150"
                >
                  Upload folder
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-[#eaeaea] bg-[#fafafa] p-4">
                <p className="text-xs font-mono text-[#666] uppercase tracking-widest mb-2">Publishing flow</p>
                <p className="text-sm text-black">
                  Publish from a saved project, a draft, or a folder upload. Paid apps will show a buy-and-clone path in the marketplace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SOURCE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSourceMode(option.id)}
                    className={`text-left border rounded-lg px-4 py-3 transition-colors duration-150 ${
                      sourceMode === option.id ? "border-black bg-black text-white" : "border-[#eaeaea] hover:border-black"
                    }`}
                  >
                    <p className={`text-sm font-medium ${sourceMode === option.id ? "text-white" : "text-black"}`}>
                      {option.title}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${sourceMode === option.id ? "text-white/70" : "text-[#666]"}`}>
                      {option.body}
                    </p>
                  </button>
                ))}
              </div>

              {sourceMode === "upload" ? (
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[#eaeaea] p-5">
                  <div>
                    <p className="text-sm font-medium text-black mb-1">Upload an app folder</p>
                    <p className="text-xs text-[#666]">Pick a folder and Kyro will turn it into a draft project.</p>
                  </div>
                  <input
                    type="file"
                    // @ts-expect-error Chromium supports folder picking via webkitdirectory.
                    webkitdirectory=""
                    multiple
                    onChange={(event) => void handleFolderUpload(event.target.files)}
                    className="text-xs text-[#666]"
                  />
                  {importingFolder && <p className="text-xs text-[#666] font-mono">Importing folder...</p>}
                  {importedFolderName && (
                    <p className="text-xs text-[#10B981] font-mono">
                      Imported {importedFolderName} ({importedFileCount} file{importedFileCount === 1 ? "" : "s"})
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-black">Project</label>
                  <select
                    value={selectedProjectId ?? ""}
                    onChange={(event) => {
                      const nextProject = projects.find((project) => project.id === event.target.value) ?? null;
                      hydrateFromProject(nextProject);
                    }}
                    className="w-full border border-[#eaeaea] rounded-md px-3 py-2 text-sm text-black outline-none focus:border-black transition-colors duration-150 bg-white"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="App name"
                placeholder="Resume Builder"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-black">Description</label>
                <textarea
                  placeholder="What does your app do? Keep it short."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full border border-[#eaeaea] rounded-md px-3 py-2 text-sm text-black placeholder:text-[#666] outline-none focus:border-black transition-colors duration-150 resize-none"
                />
                <p className="text-[11px] text-[#666] font-mono">{description.length}/120</p>
              </div>

              <Input
                label="Price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0.00"
              />

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-black">Tags</label>
                <div className="flex items-center gap-2 flex-wrap border border-[#eaeaea] rounded-md p-2 focus-within:border-black transition-colors duration-150 min-h-[40px]">
                  {tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-[11px] font-mono bg-black text-white px-2.5 py-0.5 rounded-full">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:opacity-70 transition-opacity ml-1">
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder={tags.length === 0 ? "Add tag, press Enter" : ""}
                    className="flex-1 min-w-[120px] text-xs outline-none text-black placeholder:text-[#666] bg-transparent"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {SUGGESTED_TAGS.filter((tag) => !tags.includes(tag.toLowerCase())).slice(0, 5).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="text-[11px] font-mono text-[#666] border border-[#eaeaea] px-2.5 py-0.5 rounded-full hover:border-black hover:text-black transition-colors duration-150"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-black">Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["public", "private"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setVisibility(option)}
                      className={`text-left border rounded-lg px-4 py-3 transition-colors duration-150 ${
                        visibility === option ? "border-black bg-black text-white" : "border-[#eaeaea] hover:border-black"
                      }`}
                    >
                      <p className={`text-sm font-medium capitalize ${visibility === option ? "text-white" : "text-black"}`}>{option}</p>
                      <p className={`text-[11px] mt-0.5 ${visibility === option ? "text-white/70" : "text-[#666]"}`}>
                        {option === "public" ? "Anyone can find and use this app." : "Only you can access this app."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex items-center gap-3 pt-4 border-t border-[#eaeaea]">
                <button
                  onClick={() => void handlePublish()}
                  disabled={!selectedProjectId || !name.trim() || !description.trim() || publishing}
                  className="px-6 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {publishing ? "Publishing..." : "Publish"}
                </button>
                <Link
                  href={selectedProjectId ? `/builder/${selectedProjectId}` : "/dashboard"}
                  className="text-sm text-[#666] hover:text-black transition-colors duration-150"
                >
                  Cancel
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
