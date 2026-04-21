import "server-only";

import { randomUUID } from "node:crypto";
import { readDatabase, updateDatabase } from "@/lib/backend/db";
import { createProjectCode, deriveProjectCategory } from "@/lib/backend/seed";
import type {
  AppCategory,
  AppRecord,
  Database,
  ProjectRecord,
  PublicApp,
  PublicProject,
  PublicUser,
  PurchaseRecord,
  UserRecord,
} from "@/lib/backend/types";
import { publicUser } from "@/lib/backend/auth";

function toRelativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.max(1, Math.floor(diff / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return "Yesterday";
  }

  return `${days} days ago`;
}

function isUserWorkspaceProject(project: ProjectRecord) {
  return !project.id.startsWith("seed-project-");
}

function buildPublicApp(database: Database, app: AppRecord): PublicApp {
  const creator = database.users.find((user) => user.id === app.ownerId);

  return {
    id: app.id,
    name: app.name,
    description: app.description,
    creator: creator?.name ?? "Unknown creator",
    creatorHandle: creator?.handle ?? "unknown",
    tags: app.tags,
    category: app.category,
    uses: app.uses,
    clones: app.clones,
    saves: app.saves,
    priceCents: app.priceCents,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    projectId: app.projectId,
    visibility: app.visibility,
  };
}

function hasPurchasedApp(database: Database, appId: string, userId: string) {
  return database.purchases.some((purchase) => purchase.appId === appId && purchase.userId === userId);
}

function buildPublicProject(database: Database, project: ProjectRecord): PublicProject {
  const collaboratorHandles = project.collaborators
    .map((collaborator) => database.users.find((user) => user.id === collaborator)?.handle ?? collaborator)
    .filter(Boolean);

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    visibility: project.visibility,
    tags: project.tags,
    updatedAt: project.updatedAt,
    createdAt: project.createdAt,
    collaborators: collaboratorHandles,
    code: project.code,
    sourceAppId: project.sourceAppId,
    publishedAppId: project.publishedAppId,
  };
}

export async function listApps(options?: { query?: string; category?: string; sort?: string }) {
  const database = await readDatabase();
  const query = options?.query?.trim().toLowerCase() ?? "";
  const category = options?.category ?? "All";
  const sort = options?.sort ?? "Most used";

  const apps = database.apps
    .filter((app) => app.visibility === "public")
    .filter((app) => {
      const publicApp = buildPublicApp(database, app);
      const matchesCategory = category === "All" || publicApp.category === category;
      const matchesQuery =
        !query ||
        publicApp.name.toLowerCase().includes(query) ||
        publicApp.description.toLowerCase().includes(query) ||
        publicApp.creator.toLowerCase().includes(query) ||
        publicApp.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    })
    .sort((left, right) => {
      if (sort === "Most cloned") {
        return right.clones - left.clones;
      }

      if (sort === "Newest") {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }

      return right.uses - left.uses;
    })
    .map((app) => buildPublicApp(database, app));

  return { apps };
}

export async function getHomeFeed() {
  const database = await readDatabase();
  const featuredApps = database.apps
    .filter((app) => app.visibility === "public")
    .sort((left, right) => right.uses - left.uses)
    .slice(0, 6)
    .map((app) => buildPublicApp(database, app));

  const creators = database.users
    .map((user) => {
      const creatorApps = database.apps.filter((app) => app.ownerId === user.id && app.visibility === "public");
      return {
        ...publicUser(user),
        appCount: creatorApps.length,
        totalUses: creatorApps.reduce((sum, app) => sum + app.uses, 0),
      };
    })
    .sort((left, right) => right.totalUses - left.totalUses)
    .slice(0, 4);

  return {
    apps: featuredApps,
    creators,
    liveCount: database.apps.filter((app) => app.visibility === "public").length,
  };
}

export async function getAppById(appId: string, viewerId?: string) {
  const database = await readDatabase();
  const app = database.apps.find((item) => item.id === appId);
  if (!app) {
    return null;
  }

  if (app.visibility === "private" && viewerId !== app.ownerId) {
    return null;
  }

  const project = database.projects.find((item) => item.id === app.projectId);
  const creator = database.users.find((item) => item.id === app.ownerId);
  const saved = viewerId ? database.savedApps.some((item) => item.userId === viewerId && item.appId === app.id) : false;
  const purchased = viewerId ? hasPurchasedApp(database, app.id, viewerId) : false;

  return {
    app: buildPublicApp(database, app),
    project: project ? buildPublicProject(database, project) : null,
    creator: creator ? publicUser(creator) : null,
    viewer: {
      saved,
      isOwner: viewerId === app.ownerId,
      purchased,
    },
  };
}

export async function toggleSavedApp(appId: string, userId: string) {
  return updateDatabase((database) => {
    const app = database.apps.find((item) => item.id === appId);
    if (!app) {
      throw new Error("App not found.");
    }

    if (app.visibility === "private" && app.ownerId !== userId) {
      throw new Error("This app is private.");
    }

    const existing = database.savedApps.find((item) => item.appId === appId && item.userId === userId);
    if (existing) {
      database.savedApps = database.savedApps.filter((item) => item.id !== existing.id);
      app.saves = Math.max(0, app.saves - 1);
      app.updatedAt = new Date().toISOString();
      return { saved: false, saves: app.saves };
    }

    database.savedApps.push({
      id: randomUUID(),
      userId,
      appId,
      createdAt: new Date().toISOString(),
    });
    app.saves += 1;
    app.updatedAt = new Date().toISOString();
    return { saved: true, saves: app.saves };
  });
}

export async function recordAppUse(appId: string) {
  return updateDatabase((database) => {
    const app = database.apps.find((item) => item.id === appId);
    if (!app) {
      throw new Error("App not found.");
    }

    app.uses += 1;
    app.updatedAt = new Date().toISOString();
    return { uses: app.uses };
  });
}

export async function cloneApp(appId: string, user: UserRecord) {
  return updateDatabase((database) => {
    const app = database.apps.find((item) => item.id === appId);
    const sourceProject = app ? database.projects.find((item) => item.id === app.projectId) : null;

    if (!app || !sourceProject) {
      throw new Error("App not found.");
    }

    if (app.visibility === "private" && app.ownerId !== user.id) {
      throw new Error("This app is private.");
    }

    if (app.priceCents > 0 && app.ownerId !== user.id && !hasPurchasedApp(database, appId, user.id)) {
      throw new Error("Purchase this app before cloning it.");
    }

    app.clones += 1;
    app.updatedAt = new Date().toISOString();

    const timestamp = new Date().toISOString();
    const project: ProjectRecord = {
      id: randomUUID(),
      ownerId: user.id,
      name: `${app.name} Remix`,
      description: app.description,
      status: "draft",
      visibility: "private",
      tags: app.tags,
      updatedAt: timestamp,
      createdAt: timestamp,
      collaborators: [],
      code: sourceProject.code,
      sourceAppId: app.id,
    };

    database.projects.push(project);

    return {
      project: buildPublicProject(database, project),
      clones: app.clones,
    };
  });
}

export async function purchaseApp(appId: string, userId: string) {
  return updateDatabase((database) => {
    const app = database.apps.find((item) => item.id === appId);
    if (!app) {
      throw new Error("App not found.");
    }

    if (app.visibility === "private" && app.ownerId !== userId) {
      throw new Error("This app is private.");
    }

    if (app.ownerId === userId) {
      return { purchased: true, alreadyOwned: true, amountCents: 0 };
    }

    const existing = database.purchases.find((purchase) => purchase.appId === appId && purchase.userId === userId);
    if (existing) {
      return { purchased: true, alreadyOwned: true, amountCents: existing.amountCents };
    }

    const purchase: PurchaseRecord = {
      id: randomUUID(),
      userId,
      appId,
      amountCents: app.priceCents,
      createdAt: new Date().toISOString(),
    };

    database.purchases.push(purchase);
    return { purchased: true, alreadyOwned: false, amountCents: purchase.amountCents };
  });
}

export async function requestVerification(input: {
  userId: string;
  message: string;
  proofLabel: string;
  proofDetails: string;
}) {
  return updateDatabase((database) => {
    const user = database.users.find((item) => item.id === input.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const timestamp = new Date().toISOString();
    const request = database.verificationRequests.find((item) => item.userId === input.userId);

    if (request) {
      request.message = input.message.trim();
      request.proofLabel = input.proofLabel.trim();
      request.proofDetails = input.proofDetails.trim();
      request.status = "pending";
      request.updatedAt = timestamp;
    } else {
      database.verificationRequests.push({
        id: randomUUID(),
        userId: input.userId,
        message: input.message.trim(),
        proofLabel: input.proofLabel.trim(),
        proofDetails: input.proofDetails.trim(),
        status: "pending",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    user.verificationStatus = "pending";
    user.updatedAt = timestamp;

    return publicUser(user);
  });
}

export async function approveVerificationRequest(userId: string) {
  return updateDatabase((database) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("User not found.");
    }

    user.verificationStatus = "verified";
    user.updatedAt = new Date().toISOString();

    const request = database.verificationRequests.find((item) => item.userId === userId);
    if (request) {
      request.status = "approved";
      request.updatedAt = user.updatedAt;
    }

    return publicUser(user);
  });
}

export async function listDashboard(userId: string) {
  const database = await readDatabase();
  const projects = database.projects
    .filter((project) => project.ownerId === userId && isUserWorkspaceProject(project))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  const apps = database.apps
    .filter((app) => app.ownerId === userId)
    .sort((left, right) => right.uses - left.uses);

  const totalUses = apps.reduce((sum, app) => sum + app.uses, 0);
  const totalClones = apps.reduce((sum, app) => sum + app.clones, 0);

  return {
    stats: {
      projects: projects.length,
      published: projects.filter((project) => project.status === "published").length,
      totalUses,
      clones: totalClones,
    },
    projects: projects.map((project) => ({
      ...buildPublicProject(database, project),
      relativeUpdatedAt: toRelativeTime(project.updatedAt),
    })),
    apps: apps.map((app) => buildPublicApp(database, app)),
  };
}

export async function listProjects(userId: string) {
  const database = await readDatabase();
  return database.projects
    .filter((project) => project.ownerId === userId && isUserWorkspaceProject(project))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .map((project) => buildPublicProject(database, project));
}

export async function getProject(projectId: string, userId: string) {
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);
  if (!project) {
    return null;
  }

  if (project.ownerId !== userId) {
    throw new Error("You do not have access to this project.");
  }

  return buildPublicProject(database, project);
}

export async function createProject(input: {
  ownerId: string;
  name: string;
  description: string;
  visibility?: "public" | "private";
  status?: "draft" | "published" | "private";
  tags?: string[];
  code?: string;
  sourceKind?: "project" | "draft" | "upload";
  sourceLabel?: string;
}) {
  return updateDatabase((database) => {
    const timestamp = new Date().toISOString();
    const project: ProjectRecord = {
      id: randomUUID(),
      ownerId: input.ownerId,
      name: input.name.trim() || "Untitled project",
      description: input.description.trim() || "A new Kyro project.",
      status: input.status ?? "draft",
      visibility: input.visibility ?? "private",
      tags: input.tags ?? [],
      updatedAt: timestamp,
      createdAt: timestamp,
      collaborators: [],
      code: input.code?.trim() || createProjectCode(input.name, input.description),
      sourceKind: input.sourceKind,
      sourceLabel: input.sourceLabel?.trim(),
    };

    database.projects.push(project);
    return buildPublicProject(database, project);
  });
}

export async function updateProject(
  projectId: string,
  userId: string,
  input: Partial<Pick<ProjectRecord, "name" | "description" | "code" | "visibility" | "status" | "tags">>,
) {
  return updateDatabase((database) => {
    const project = database.projects.find((item) => item.id === projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.ownerId !== userId) {
      throw new Error("You do not have access to this project.");
    }

    if (typeof input.name === "string") {
      project.name = input.name.trim() || project.name;
    }
    if (typeof input.description === "string") {
      project.description = input.description.trim() || project.description;
    }
    if (typeof input.code === "string") {
      project.code = input.code;
    }
    if (input.visibility) {
      project.visibility = input.visibility;
    }
    if (input.status) {
      project.status = input.status;
    }
    if (input.tags) {
      project.tags = input.tags;
    }

    project.updatedAt = new Date().toISOString();

    return buildPublicProject(database, project);
  });
}

export async function publishProject(
  projectId: string,
  userId: string,
  input: {
    name?: string;
    description?: string;
    tags?: string[];
    visibility?: "public" | "private";
    category?: AppCategory;
    priceCents?: number;
    sourceKind?: "project" | "draft" | "upload";
    sourceLabel?: string;
  },
) {
  return updateDatabase((database) => {
    const user = database.users.find((item) => item.id === userId);
    const project = database.projects.find((item) => item.id === projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.ownerId !== userId) {
      throw new Error("You do not have access to this project.");
    }

    if (!user) {
      throw new Error("User not found.");
    }

    if (user.verificationStatus !== "verified") {
      throw new Error("Verification required before publishing.");
    }

    const timestamp = new Date().toISOString();
    project.name = input.name?.trim() || project.name;
    project.description = input.description?.trim() || project.description;
    project.tags = input.tags ?? project.tags;
    project.status = input.visibility === "private" ? "private" : "published";
    project.visibility = input.visibility ?? "public";
    project.sourceKind = input.sourceKind ?? project.sourceKind;
    project.sourceLabel = input.sourceLabel?.trim() || project.sourceLabel;
    project.updatedAt = timestamp;

    let app = project.publishedAppId ? database.apps.find((item) => item.id === project.publishedAppId) : undefined;

    if (!app) {
      app = {
        id: randomUUID(),
        projectId: project.id,
        ownerId: userId,
        name: project.name,
        description: project.description,
        tags: project.tags,
        category: input.category ?? deriveProjectCategory(project.tags),
        uses: 0,
        clones: 0,
        saves: 0,
        priceCents: Math.max(0, Math.round(input.priceCents ?? 0)),
        visibility: project.visibility,
        createdAt: project.createdAt,
        updatedAt: timestamp,
        publishedAt: timestamp,
      };
      project.publishedAppId = app.id;
      database.apps.push(app);
    } else {
      app.name = project.name;
      app.description = project.description;
      app.tags = project.tags;
      app.category = input.category ?? deriveProjectCategory(project.tags);
      app.visibility = project.visibility;
      app.priceCents = Math.max(0, Math.round(input.priceCents ?? app.priceCents));
      app.updatedAt = timestamp;
    }

    return {
      project: buildPublicProject(database, project),
      app: buildPublicApp(database, app),
    };
  });
}

export async function getCreatorProfile(handle: string) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.handle === handle);
  if (!user) {
    return null;
  }

  const apps = database.apps
    .filter((app) => app.ownerId === user.id && app.visibility === "public")
    .sort((left, right) => right.uses - left.uses)
    .map((app) => buildPublicApp(database, app));

  return {
    creator: {
      ...publicUser(user),
      appCount: apps.length,
      totalUses: apps.reduce((sum, app) => sum + app.uses, 0),
    },
    apps,
  };
}

export async function getSettingsProfile(userId: string) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);
  if (!user) {
    return null;
  }

  return publicUser(user);
}

export async function updateSettingsProfile(
  userId: string,
  input: Partial<Pick<PublicUser, "name" | "handle" | "bio">>,
) {
  return updateDatabase((database) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("User not found.");
    }

    if (typeof input.name === "string" && input.name.trim()) {
      user.name = input.name.trim();
    }
    if (typeof input.bio === "string") {
      user.bio = input.bio.trim();
    }
    if (typeof input.handle === "string" && input.handle.trim()) {
      const nextHandle = input.handle.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!nextHandle) {
        throw new Error("Handle must include letters or numbers.");
      }

      const duplicate = database.users.find((candidate) => candidate.handle === nextHandle && candidate.id !== userId);
      if (duplicate) {
        throw new Error("That handle is already taken.");
      }
      user.handle = nextHandle;
    }

    user.updatedAt = new Date().toISOString();
    return publicUser(user);
  });
}

export async function getAuthenticatedUser(viewerId?: string): Promise<PublicUser | null> {
  if (!viewerId) {
    return null;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === viewerId);
  return user ? publicUser(user) : null;
}
