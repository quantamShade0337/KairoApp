export type UserInterest = "builder" | "explorer" | "both";
export type VerificationStatus = "unverified" | "pending" | "verified";

export type ProjectStatus = "draft" | "published" | "private";
export type AppCategory = "Tools" | "AI" | "Dev" | "Productivity";
export type AppVisibility = "public" | "private";

export type UserRecord = {
  id: string;
  name: string;
  handle: string;
  email: string;
  passwordHash: string;
  bio: string;
  interests: UserInterest[];
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type ProjectRecord = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  visibility: AppVisibility;
  tags: string[];
  updatedAt: string;
  createdAt: string;
  collaborators: string[];
  code: string;
  sourceAppId?: string;
  publishedAppId?: string;
  sourceKind?: "project" | "draft" | "upload";
  sourceLabel?: string;
};

export type AppRecord = {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  description: string;
  tags: string[];
  category: AppCategory;
  uses: number;
  clones: number;
  saves: number;
  priceCents: number;
  visibility: AppVisibility;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
};

export type PurchaseRecord = {
  id: string;
  userId: string;
  appId: string;
  amountCents: number;
  createdAt: string;
};

export type VerificationRequestRecord = {
  id: string;
  userId: string;
  message: string;
  proofLabel: string;
  proofDetails: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};

export type SavedAppRecord = {
  id: string;
  userId: string;
  appId: string;
  createdAt: string;
};

export type Database = {
  users: UserRecord[];
  sessions: SessionRecord[];
  projects: ProjectRecord[];
  apps: AppRecord[];
  purchases: PurchaseRecord[];
  verificationRequests: VerificationRequestRecord[];
  savedApps: SavedAppRecord[];
};

export type PublicUser = {
  id: string;
  name: string;
  handle: string;
  email: string;
  bio: string;
  interests: UserInterest[];
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
};

export type PublicApp = {
  id: string;
  name: string;
  description: string;
  creator: string;
  creatorHandle: string;
  tags: string[];
  category: AppCategory;
  uses: number;
  clones: number;
  saves: number;
  priceCents: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  visibility: AppVisibility;
};

export type PublicProject = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  visibility: AppVisibility;
  tags: string[];
  updatedAt: string;
  createdAt: string;
  collaborators: string[];
  code: string;
  sourceAppId?: string;
  publishedAppId?: string;
};
