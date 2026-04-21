import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSeedDatabase } from "@/lib/backend/seed";
import type { Database } from "@/lib/backend/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "kyro-db.json");

let writeQueue = Promise.resolve();

async function ensureDatabaseFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DB_PATH, "utf8");
  } catch {
    const seed = createSeedDatabase();
    await writeFile(DB_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

function migrateDatabase(database: Database) {
  let mutated = false;
  const demoUserIds = new Set(["c1", "c2", "c3", "c4"]);
  const demoAppIds = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
  const demoProjectIds = new Set([...Array.from(demoAppIds, (id) => `seed-project-${id}`), "p1", "p2", "p3"]);

  database.users = database.users.filter((user) => !demoUserIds.has(user.id));
  database.projects = database.projects.filter((project) => !demoProjectIds.has(project.id) && !demoUserIds.has(project.ownerId));
  database.apps = database.apps.filter((app) => !demoAppIds.has(app.id) && !demoUserIds.has(app.ownerId));
  database.savedApps = database.savedApps.filter((savedApp) => !demoAppIds.has(savedApp.appId) && !demoUserIds.has(savedApp.userId));
  database.purchases = (database.purchases ?? []).filter((purchase) => !demoAppIds.has(purchase.appId) && !demoUserIds.has(purchase.userId));
  database.verificationRequests = (database.verificationRequests ?? []).filter((request) => !demoUserIds.has(request.userId));
  database.sessions = database.sessions.filter((session) => !demoUserIds.has(session.userId));

  for (const user of database.users) {
    if (!user.verificationStatus) {
      user.verificationStatus = "unverified";
      mutated = true;
    }
  }

  for (const app of database.apps) {
    if (typeof app.priceCents !== "number") {
      app.priceCents = 0;
      mutated = true;
    }
  }

  database.purchases ??= [];
  database.verificationRequests ??= [];

  return mutated;
}

export async function readDatabase(): Promise<Database> {
  await ensureDatabaseFile();
  const raw = await readFile(DB_PATH, "utf8");
  const database = JSON.parse(raw) as Database;

  if (migrateDatabase(database)) {
    await writeDatabase(database);
  }

  return database;
}

async function writeDatabase(database: Database) {
  await writeFile(DB_PATH, JSON.stringify(database, null, 2), "utf8");
}

export async function updateDatabase<T>(updater: (database: Database) => Promise<T> | T): Promise<T> {
  const nextResult = writeQueue.then(async () => {
    const database = await readDatabase();
    const result = await updater(database);
    await writeDatabase(database);
    return result;
  });

  writeQueue = nextResult.then(() => undefined, () => undefined);
  return nextResult;
}
