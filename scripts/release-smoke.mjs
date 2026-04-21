import fs from "node:fs";
import path from "node:path";

const baseUrl = "http://localhost:3001";
const dbPath = path.join(process.cwd(), "data", "kyro-db.json");

class Client {
  constructor(name) {
    this.name = name;
    this.cookies = new Map();
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  storeSetCookie(headers) {
    const raw = headers.get("set-cookie");
    if (!raw) return;
    const chunks = raw.split(/, (?=[^;]+?=)/g);
    for (const chunk of chunks) {
      const first = chunk.split(";")[0];
      const idx = first.indexOf("=");
      if (idx <= 0) continue;
      const key = first.slice(0, idx).trim();
      const value = first.slice(idx + 1).trim();
      if (!value) {
        this.cookies.delete(key);
      } else {
        this.cookies.set(key, value);
      }
    }
  }

  async request(method, route, body) {
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.cookies.size ? { cookie: this.cookieHeader() } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    this.storeSetCookie(response.headers);

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return { ok: response.ok, status: response.status, payload };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyUserByEmail(email) {
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const user = db.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error(`User not found for verification: ${email}`);
  }
  user.verificationStatus = "verified";
  user.updatedAt = new Date().toISOString();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function run() {
  const runId = Date.now();
  const sellerEmail = `seller.${runId}@example.com`;
  const buyerEmail = `buyer.${runId}@example.com`;
  const password = "password123";

  const seller = new Client("seller");
  const buyer = new Client("buyer");

  console.log("1) signup seller");
  let result = await seller.request("POST", "/api/auth/signup", {
    name: "Seller User",
    email: sellerEmail,
    password,
    interest: "publish",
  });
  assert(result.ok, `seller signup failed: ${result.status} ${JSON.stringify(result.payload)}`);

  console.log("2) create draft project");
  result = await seller.request("POST", "/api/projects", {
    name: "Smoke Test App",
    description: "E2E release smoke test app",
    code: "export default function App(){return <div>smoke</div>}",
    status: "draft",
    visibility: "private",
    sourceKind: "draft",
    sourceLabel: "wizard draft",
  });
  assert(result.ok, `create project failed: ${result.status} ${JSON.stringify(result.payload)}`);
  const projectId = result.payload?.project?.id;
  assert(projectId, "missing projectId");

  console.log("3) unverified publish should fail");
  result = await seller.request("POST", `/api/projects/${projectId}/publish`, {
    name: "Smoke Test App",
    description: "Paid listing for smoke test",
    tags: ["ai", "smoke", "test"],
    visibility: "public",
    category: "AI",
    priceCents: 299,
    sourceKind: "draft",
    sourceLabel: "wizard draft",
  });
  assert(!result.ok, `expected publish failure before verification, got: ${result.status}`);

  console.log("4) submit verification request");
  result = await seller.request("POST", "/api/verification/request", {
    message: "Please verify for marketplace publishing",
    proofLabel: "Portfolio",
    proofDetails: "https://example.com/portfolio",
  });
  assert(result.ok, `verification request failed: ${result.status} ${JSON.stringify(result.payload)}`);

  console.log("5) simulate admin verification in local DB");
  verifyUserByEmail(sellerEmail);

  console.log("6) publish should pass after verification");
  result = await seller.request("POST", `/api/projects/${projectId}/publish`, {
    name: "Smoke Test App",
    description: "Paid listing for smoke test",
    tags: ["ai", "smoke", "test"],
    visibility: "public",
    category: "AI",
    priceCents: 299,
    sourceKind: "draft",
    sourceLabel: "wizard draft",
  });
  assert(result.ok, `publish failed after verification: ${result.status} ${JSON.stringify(result.payload)}`);
  const appId = result.payload?.app?.id;
  assert(appId, "missing appId");

  console.log("7) signup buyer");
  result = await buyer.request("POST", "/api/auth/signup", {
    name: "Buyer User",
    email: buyerEmail,
    password,
    interest: "discover",
  });
  assert(result.ok, `buyer signup failed: ${result.status} ${JSON.stringify(result.payload)}`);

  console.log("8) buyer clone before purchase should fail");
  result = await buyer.request("POST", `/api/apps/${appId}/clone`);
  assert(!result.ok, `expected clone failure before purchase, got: ${result.status}`);

  console.log("9) buyer purchase should pass");
  result = await buyer.request("POST", `/api/apps/${appId}/purchase`);
  assert(result.ok, `purchase failed: ${result.status} ${JSON.stringify(result.payload)}`);

  console.log("10) buyer clone after purchase should pass");
  result = await buyer.request("POST", `/api/apps/${appId}/clone`);
  assert(result.ok, `clone failed after purchase: ${result.status} ${JSON.stringify(result.payload)}`);
  const remixId = result.payload?.project?.id;
  assert(remixId, "missing remix project id");

  console.log("11) buyer can fetch remix project");
  result = await buyer.request("GET", `/api/projects/${remixId}`);
  assert(result.ok, `fetch remix failed: ${result.status} ${JSON.stringify(result.payload)}`);

  console.log("\n✅ Release smoke passed");
  console.log(JSON.stringify({ sellerEmail, buyerEmail, projectId, appId, remixId }, null, 2));
}

run().catch((error) => {
  console.error("\n❌ Release smoke failed");
  console.error(error.message || error);
  process.exit(1);
});
