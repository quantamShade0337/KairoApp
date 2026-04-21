export type App = {
  id: string;
  name: string;
  description: string;
  creator: string;
  creatorHandle: string;
  tags: string[];
  category: "Tools" | "AI" | "Dev" | "Productivity";
  uses: number;
  clones: number;
  createdAt: string;
  priceCents?: number;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: "draft" | "published" | "private";
  updatedAt: string;
  collaborators: string[];
};

export type Creator = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  appCount: number;
  totalUses: number;
};

export const APPS: App[] = [
  {
    id: "1",
    name: "Markdown Editor",
    description: "Clean markdown editor with live preview and export.",
    creator: "Alex Chen",
    creatorHandle: "alexc",
    tags: ["markdown", "writing", "editor"],
    category: "Tools",
    uses: 2841,
    clones: 134,
    createdAt: "2024-11-12",
  },
  {
    id: "2",
    name: "Resume Builder",
    description: "Generate clean, ATS-friendly resumes in minutes.",
    creator: "Maya Patel",
    creatorHandle: "mayap",
    tags: ["resume", "career", "generator"],
    category: "Productivity",
    uses: 5120,
    clones: 280,
    createdAt: "2024-10-03",
    priceCents: 999,
  },
  {
    id: "3",
    name: "Color Palette Gen",
    description: "Generate harmonious color palettes from a single hex.",
    creator: "Tom Rivera",
    creatorHandle: "tomr",
    tags: ["design", "color", "tool"],
    category: "Tools",
    uses: 3340,
    clones: 97,
    createdAt: "2024-12-01",
  },
  {
    id: "4",
    name: "AI Text Summarizer",
    description: "Paste any text, get a concise summary in one click.",
    creator: "Sarah Kim",
    creatorHandle: "sarahk",
    tags: ["AI", "writing", "productivity"],
    category: "AI",
    uses: 7800,
    clones: 412,
    createdAt: "2024-09-18",
    priceCents: 1299,
  },
  {
    id: "5",
    name: "JSON Formatter",
    description: "Instantly format, validate, and minify JSON.",
    creator: "Dev Nair",
    creatorHandle: "devn",
    tags: ["dev", "json", "utility"],
    category: "Dev",
    uses: 9100,
    clones: 320,
    createdAt: "2024-08-22",
    priceCents: 499,
  },
  {
    id: "6",
    name: "Budget Tracker",
    description: "Simple income and expense tracker with monthly overview.",
    creator: "Lena Park",
    creatorHandle: "lenap",
    tags: ["finance", "budget", "personal"],
    category: "Productivity",
    uses: 1980,
    clones: 88,
    createdAt: "2024-11-28",
  },
  {
    id: "7",
    name: "Pomodoro Timer",
    description: "Focus timer with configurable work and break intervals.",
    creator: "Chris Muller",
    creatorHandle: "chrism",
    tags: ["productivity", "focus", "timer"],
    category: "Productivity",
    uses: 4420,
    clones: 199,
    createdAt: "2024-10-15",
  },
  {
    id: "8",
    name: "Regex Tester",
    description: "Test and debug regular expressions with live match highlighting.",
    creator: "Dev Nair",
    creatorHandle: "devn",
    tags: ["dev", "regex", "utility"],
    category: "Dev",
    uses: 6600,
    clones: 245,
    createdAt: "2024-09-05",
  },
  {
    id: "9",
    name: "Study Flashcards",
    description: "Create and review flashcard decks with spaced repetition.",
    creator: "Maya Patel",
    creatorHandle: "mayap",
    tags: ["study", "learning", "education"],
    category: "Productivity",
    uses: 2200,
    clones: 143,
    createdAt: "2024-12-10",
  },
  {
    id: "10",
    name: "API Tester",
    description: "Lightweight REST API client. No account required.",
    creator: "Alex Chen",
    creatorHandle: "alexc",
    tags: ["dev", "API", "testing"],
    category: "Dev",
    uses: 4800,
    clones: 301,
    createdAt: "2024-07-30",
  },
  {
    id: "11",
    name: "AI Prompt Lab",
    description: "Build, test, and iterate on prompts with side-by-side output.",
    creator: "Sarah Kim",
    creatorHandle: "sarahk",
    tags: ["AI", "prompts", "dev"],
    category: "AI",
    uses: 3900,
    clones: 178,
    createdAt: "2024-11-05",
  },
  {
    id: "12",
    name: "Link Shortener",
    description: "Shorten URLs with custom aliases and click tracking.",
    creator: "Tom Rivera",
    creatorHandle: "tomr",
    tags: ["utility", "links", "sharing"],
    category: "Tools",
    uses: 5500,
    clones: 210,
    createdAt: "2024-10-22",
  },
];

export const PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Invoice Generator",
    description: "Generate clean PDF invoices for freelancers.",
    status: "draft",
    updatedAt: "2 hours ago",
    collaborators: ["alexc", "mayap"],
  },
  {
    id: "p2",
    name: "Reading List Tracker",
    description: "Track books with notes and reading progress.",
    status: "published",
    updatedAt: "Yesterday",
    collaborators: ["alexc"],
  },
  {
    id: "p3",
    name: "Code Snippet Manager",
    description: "Save and search reusable code snippets.",
    status: "private",
    updatedAt: "3 days ago",
    collaborators: ["alexc", "devn", "chrism"],
  },
];

export const CREATORS: Creator[] = [
  {
    id: "c1",
    name: "Alex Chen",
    handle: "alexc",
    bio: "Building tools for developers. Obsessed with simplicity.",
    appCount: 12,
    totalUses: 28400,
  },
  {
    id: "c2",
    name: "Maya Patel",
    handle: "mayap",
    bio: "Product designer turned builder. I make things I wish existed.",
    appCount: 8,
    totalUses: 19600,
  },
  {
    id: "c3",
    name: "Sarah Kim",
    handle: "sarahk",
    bio: "AI tools for everyday people. Less friction, more output.",
    appCount: 6,
    totalUses: 34200,
  },
  {
    id: "c4",
    name: "Dev Nair",
    handle: "devn",
    bio: "Dev utilities that should have existed years ago.",
    appCount: 9,
    totalUses: 41100,
  },
];
