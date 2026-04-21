import "server-only";

import { initializeApp, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Database } from "@/lib/backend/types";

function getFirestoreDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID not configured");
  }

  let app;

  try {
    // Try to get existing app
    app = getApp();
  } catch {
    // App doesn't exist, initialize it
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } else {
      app = initializeApp({
        projectId,
      });
    }
  }

  return getFirestore(app);
}

const COLLECTION_PREFIX = "kyro";

export async function readDatabase(): Promise<Database> {
  const db = getFirestoreDb();

  const [usersSnap, projectsSnap, appsSnap, sessionsSnap, savedAppsSnap, purchasesSnap, verificationSnap] =
    await Promise.all([
      db.collection(`${COLLECTION_PREFIX}_users`).get(),
      db.collection(`${COLLECTION_PREFIX}_projects`).get(),
      db.collection(`${COLLECTION_PREFIX}_apps`).get(),
      db.collection(`${COLLECTION_PREFIX}_sessions`).get(),
      db.collection(`${COLLECTION_PREFIX}_savedApps`).get(),
      db.collection(`${COLLECTION_PREFIX}_purchases`).get(),
      db.collection(`${COLLECTION_PREFIX}_verificationRequests`).get(),
    ]);

  return {
    users: usersSnap.docs.map((doc) => doc.data() as unknown),
    projects: projectsSnap.docs.map((doc) => doc.data() as unknown),
    apps: appsSnap.docs.map((doc) => doc.data() as unknown),
    sessions: sessionsSnap.docs.map((doc) => doc.data() as unknown),
    savedApps: savedAppsSnap.docs.map((doc) => doc.data() as unknown),
    purchases: purchasesSnap.docs.map((doc) => doc.data() as unknown),
    verificationRequests: verificationSnap.docs.map((doc) => doc.data() as unknown),
  } as Database;
}

async function writeDatabase(database: Database) {
  const db = getFirestoreDb();
  const batch = db.batch();

  // Write all collections
  for (const user of database.users) {
    const ref = db.collection(`${COLLECTION_PREFIX}_users`).doc(user.id);
    batch.set(ref, user, { merge: true });
  }

  for (const project of database.projects) {
    const ref = db.collection(`${COLLECTION_PREFIX}_projects`).doc(project.id);
    batch.set(ref, project, { merge: true });
  }

  for (const app of database.apps) {
    const ref = db.collection(`${COLLECTION_PREFIX}_apps`).doc(app.id);
    batch.set(ref, app, { merge: true });
  }

  for (const session of database.sessions) {
    const ref = db.collection(`${COLLECTION_PREFIX}_sessions`).doc(session.id);
    batch.set(ref, session, { merge: true });
  }

  for (const savedApp of database.savedApps) {
    const ref = db.collection(`${COLLECTION_PREFIX}_savedApps`).doc(savedApp.id);
    batch.set(ref, savedApp, { merge: true });
  }

  for (const purchase of database.purchases) {
    const ref = db.collection(`${COLLECTION_PREFIX}_purchases`).doc(purchase.id);
    batch.set(ref, purchase, { merge: true });
  }

  for (const verification of database.verificationRequests) {
    const ref = db.collection(`${COLLECTION_PREFIX}_verificationRequests`).doc(verification.id);
    batch.set(ref, verification, { merge: true });
  }

  await batch.commit();
}

let updateQueue = Promise.resolve();

export async function updateDatabase<T>(updater: (database: Database) => Promise<T> | T): Promise<T> {
  const nextResult = updateQueue.then(async () => {
    const database = await readDatabase();
    const result = await updater(database);
    await writeDatabase(database);
    return result;
  });

  updateQueue = nextResult.then(() => undefined, () => undefined);
  return nextResult;
}
