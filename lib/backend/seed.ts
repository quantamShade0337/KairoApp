import type { AppCategory, Database } from "@/lib/backend/types";

export const DEMO_PASSWORD_HASH =
  "scrypt:16384:8:1$demo-password123-salt$ef9dc05dff9329aac70023649dc8c575001f1284b89ec45344db7af370a6b2a3ab6c42ba1f5221891e08a93d41b9f5935355fa480795055aa8786b5030fb955a";

function genericCodeTemplate(name: string, description: string) {
  return `export default function App() {
  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold mb-4">${name}</h1>
        <p className="text-sm text-neutral-600">${description}</p>
      </div>
    </main>
  );
}`;
}

function deriveCategory(tags: string[]): AppCategory {
  const normalized = tags.map((tag) => tag.toLowerCase());

  if (normalized.some((tag) => ["ai", "prompt", "prompts", "summarizer"].includes(tag))) {
    return "AI";
  }

  if (normalized.some((tag) => ["dev", "api", "json", "regex", "testing"].includes(tag))) {
    return "Dev";
  }

  if (normalized.some((tag) => ["productivity", "study", "learning", "focus", "timer"].includes(tag))) {
    return "Productivity";
  }

  return "Tools";
}

export function createSeedDatabase(): Database {
  return {
    users: [],
    sessions: [],
    projects: [],
    apps: [],
    purchases: [],
    verificationRequests: [],
    savedApps: [],
  };
}

export function createProjectCode(name: string, description: string) {
  return genericCodeTemplate(name, description);
}

export function deriveProjectCategory(tags: string[]) {
  return deriveCategory(tags);
}

export const SEED_CREDENTIALS = {
  email: "alexc@kyro.dev",
  password: "password123",
};
