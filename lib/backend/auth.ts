import "server-only";

import { randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { updateDatabase, readDatabase } from "@/lib/backend/db";
import type { PublicUser, SessionRecord, UserInterest, UserRecord } from "@/lib/backend/types";
import { firebaseSignin, firebaseSignup, getFirebaseAuthConfig } from "@/lib/backend/firebase-auth";

const scrypt = promisify(nodeScrypt);

export const SESSION_COOKIE = "kyro_session";
const SESSION_TTL_DAYS = 30;

function shouldUseFirebaseAuth() {
  const provider = (process.env.KYRO_AUTH_PROVIDER ?? process.env.AUTH_PROVIDER ?? "").trim().toLowerCase();
  return provider === "firebase" && !!getFirebaseAuthConfig();
}

function now() {
  return new Date();
}

export function publicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    email: user.email,
    bio: user.bio,
    interests: user.interests,
    verificationStatus: user.verificationStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:16384:8:1$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [scheme, salt, expectedHex] = passwordHash.split("$");
  if (!scheme || !salt || !expectedHex || !scheme.startsWith("scrypt:")) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

function sessionExpiry() {
  const expires = now();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
  return expires.toISOString();
}

async function shouldUseSecureCookie() {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = headerStore.get("host") ?? "";

  if (forwardedProto === "http") {
    return false;
  }

  if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) {
    return false;
  }

  return true;
}

export async function createSession(userId: string) {
  const session: SessionRecord = {
    id: randomUUID(),
    userId,
    createdAt: now().toISOString(),
    expiresAt: sessionExpiry(),
  };

  await updateDatabase((database) => {
    database.sessions = database.sessions.filter((item) => new Date(item.expiresAt) > now());
    database.sessions.push(session);
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldUseSecureCookie(),
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });

  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await updateDatabase((database) => {
      database.sessions = database.sessions.filter((session) => session.id !== sessionId);
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return null;
  }

  const database = await readDatabase();
  const session = database.sessions.find((item) => item.id === sessionId);

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) <= now()) {
    await clearSession();
    return null;
  }

  return database.users.find((user) => user.id === session.userId) ?? null;
}

function normalizeHandleSegment(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}

async function createUniqueHandle(name: string) {
  const database = await readDatabase();
  const base = normalizeHandleSegment(name) || "builder";

  let candidate = base;
  let index = 1;
  while (database.users.some((user) => user.handle === candidate)) {
    index += 1;
    candidate = `${base}${index}`;
  }

  return candidate;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  interest?: UserInterest | null;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) {
    throw new Error("Name is required.");
  }

  if (!email.includes("@")) {
    throw new Error("A valid email is required.");
  }

  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const handle = await createUniqueHandle(name);
  const passwordHash = await hashPassword(input.password);
  const timestamp = now().toISOString();

  const user = await updateDatabase(async (database) => {
    if (database.users.some((existingUser) => existingUser.email === email)) {
      throw new Error("An account with this email already exists.");
    }

    const nextUser: UserRecord = {
      id: randomUUID(),
      name,
      handle,
      email,
      passwordHash,
      bio: "New on Kyro. Shipping something small and useful.",
      interests: input.interest ? [input.interest] : ["both"],
      verificationStatus: "unverified",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    database.users.push(nextUser);
    return nextUser;
  });

  await createSession(user.id);
  return publicUser(user);
}

export async function authenticateUser(email: string, password: string) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.email === email.trim().toLowerCase());

  if (!user) {
    throw new Error("No account found for this email.");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("Incorrect password.");
  }

  await createSession(user.id);
  return publicUser(user);
}

async function syncFirebaseUserToLocal(input: {
  email: string;
  name: string;
  interest?: UserInterest | null;
}) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || email.split("@")[0] || "Builder";
  const placeholderPasswordHash = await hashPassword(randomUUID());

  return updateDatabase(async (database) => {
    const existing = database.users.find((user) => user.email === email);
    const timestamp = now().toISOString();

    if (existing) {
      if (existing.name !== name || existing.updatedAt === existing.createdAt) {
        existing.name = name;
        existing.updatedAt = timestamp;
      }
      if (input.interest && !existing.interests.includes(input.interest)) {
        existing.interests = [input.interest];
        existing.updatedAt = timestamp;
      }
      return existing;
    }

    const handle = await createUniqueHandle(name);
    const nextUser: UserRecord = {
      id: randomUUID(),
      name,
      handle,
      email,
      passwordHash: placeholderPasswordHash,
      bio: "New on Kyro. Shipping something small and useful.",
      interests: input.interest ? [input.interest] : ["both"],
      verificationStatus: "unverified",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    database.users.push(nextUser);
    return nextUser;
  });
}

export async function registerUserWithFirebase(input: {
  name: string;
  email: string;
  password: string;
  interest?: UserInterest | null;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) {
    throw new Error("Name is required.");
  }

  if (!email.includes("@")) {
    throw new Error("A valid email is required.");
  }

  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!shouldUseFirebaseAuth()) {
    return registerUser(input);
  }

  try {
    await firebaseSignup({
      email,
      password: input.password,
      displayName: name,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Firebase signup failed in non-production; falling back to local auth.", error);
      return registerUser(input);
    }
    throw error;
  }

  const user = await syncFirebaseUserToLocal({
    email,
    name,
    interest: input.interest,
  });

  await createSession(user.id);
  return publicUser(user);
}

export async function authenticateUserWithFirebase(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();

  if (!shouldUseFirebaseAuth()) {
    return authenticateUser(email, input.password);
  }

  let firebaseUser;
  try {
    firebaseUser = await firebaseSignin({
      email,
      password: input.password,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Firebase signin failed in non-production; falling back to local auth.", error);
      return authenticateUser(email, input.password);
    }
    throw error;
  }

  const user = await syncFirebaseUserToLocal({
    email: firebaseUser.email,
    name: firebaseUser.displayName?.trim() || firebaseUser.email.split("@")[0] || "Builder",
  });

  await createSession(user.id);
  return publicUser(user);
}
