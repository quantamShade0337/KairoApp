import "server-only";

type FirebaseAuthConfig = {
  apiKey: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
};

type FirebaseAuthResponse = {
  localId: string;
  email: string;
  displayName?: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
};

function readConfig(): FirebaseAuthConfig | null {
  const apiKey =
    process.env.FIREBASE_API_KEY ??
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    process.env.apiKey;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN ??
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
      process.env.authDomain,
    projectId:
      process.env.FIREBASE_PROJECT_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
      process.env.projectId,
    appId:
      process.env.FIREBASE_APP_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
      process.env.appId,
  };
}

export function getFirebaseAuthConfig() {
  return readConfig();
}

async function callFirebaseAuth<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const config = readConfig();
  if (!config) {
    throw new Error("Firebase Auth is not configured.");
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${config.apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json()) as { error?: { message?: string } } & T;

  if (!response.ok) {
    throw new Error(mapFirebaseError(payload.error?.message));
  }

  return payload;
}

function mapFirebaseError(code?: string) {
  switch (code) {
    case "EMAIL_EXISTS":
      return "An account with this email already exists.";
    case "EMAIL_NOT_FOUND":
      return "No account found for this email.";
    case "INVALID_PASSWORD":
      return "Incorrect password.";
    case "WEAK_PASSWORD : Password should be at least 6 characters":
    case "WEAK_PASSWORD":
      return "Password must be at least 6 characters.";
    case "INVALID_EMAIL":
      return "A valid email is required.";
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return "Too many attempts. Try again later.";
    default:
      return "Firebase authentication failed.";
  }
}

export async function firebaseSignup(input: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const response = await callFirebaseAuth<FirebaseAuthResponse>("accounts:signUp", {
    email: input.email,
    password: input.password,
    returnSecureToken: true,
  });

  if (input.displayName?.trim()) {
    await callFirebaseAuth<FirebaseAuthResponse>("accounts:update", {
      idToken: response.idToken,
      displayName: input.displayName.trim(),
      returnSecureToken: true,
    });
    response.displayName = input.displayName.trim();
  }

  return response;
}

export async function firebaseSignin(input: { email: string; password: string }) {
  return callFirebaseAuth<FirebaseAuthResponse>("accounts:signInWithPassword", {
    email: input.email,
    password: input.password,
    returnSecureToken: true,
  });
}
