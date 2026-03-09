/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KYRO — Complete Backend Server
 *  Developer Marketplace Platform
 *
 *  Stack: Node.js (built-ins only) + in-memory DB (swap for real DB at any time)
 *
 *  Features:
 *    1.  Auth           — register, login, sessions, JWT, password hashing
 *    2.  Scoring        — developer trust score engine
 *    3.  Ranking        — marketplace placement, trending, relevance
 *    4.  Products       — full CRUD + metadata
 *    5.  Storefronts    — per-developer store pages
 *    6.  Messaging      — threads, messages, read receipts
 *    7.  Reports        — abuse detection, penalty system
 *    8.  Search         — full-text + filters + faceted sort
 *    9.  Analytics      — per-user + platform-wide stats
 *    10. Static files   — serves index.html, app.html, login.html
 *
 *  Run:  node server.js
 *  Port: 3000 (set PORT env var to override)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const http     = require('http');
const https    = require('https');
const fs       = require('fs');
const path     = require('path');
const url      = require('url');
const crypto   = require('crypto');
const querystr = require('querystring');

// ─── Config ───────────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const lines = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      process.env[k] = process.env[k] ?? v;
    }
  } catch { /* no .env, use process.env */ }
}
loadEnv();

const CONFIG = {
  PORT:           process.env.PORT            || 3000,
  JWT_SECRET:     process.env.JWT_SECRET      || crypto.randomBytes(32).toString('hex'),
  BCRYPT_ROUNDS:  parseInt(process.env.BCRYPT_ROUNDS || '12'),
  SESSION_TTL_MS: 30 * 24 * 60 * 60 * 1000,  // 30 days
  TOKEN_TTL_S:    60 * 60 * 24 * 30,          // 30 days in seconds
  MAX_REPORTS_BEFORE_SUSPEND: 5,
  TRENDING_WINDOW_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SCORE_DECAY_DAYS: 30,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,      // 10 MB body limit
  GITHUB_CLIENT_ID:     process.env.GITHUB_CLIENT_ID     || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  BASE_URL:       process.env.BASE_URL        || 'http://localhost:3000',
};


// ════════════════════════════════════════════════════════════════════════════════
//  ██████╗ ██████╗
//  ██╔══██╗██╔══██╗
//  ██║  ██║██████╔╝   — IN-MEMORY DATABASE
//  ██║  ██║██╔══██╗      (swap every db.X call for your real ORM/driver)
//  ██████╔╝██████╔╝
//  ╚═════╝ ╚═════╝
// ════════════════════════════════════════════════════════════════════════════════

const db = {
  //  users[id] = User
  users: new Map(),

  //  products[id] = Product
  products: new Map(),

  //  sessions[token] = { userId, expiresAt }
  sessions: new Map(),

  //  threads[id] = Thread  (thread between two users about a product)
  threads: new Map(),

  //  messages[id] = Message
  messages: new Map(),

  //  reports[id] = Report
  reports: new Map(),

  //  views[productId] = [{ userId|ip, ts }]  — for trending calc
  views: new Map(),

  //  ratings[productId+userId] = { score:1-5, createdAt }
  ratings: new Map(),

  // ── helpers ──
  nextId() { return crypto.randomUUID(); },

  findUserByUsername(username) {
    for (const u of this.users.values())
      if (u.username.toLowerCase() === username.toLowerCase()) return u;
    return null;
  },

  findUserByEmail(email) {
    for (const u of this.users.values())
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    return null;
  },

  getProductsByUser(userId) {
    return [...this.products.values()].filter(p => p.userId === userId && !p.deleted);
  },

  getPublishedProducts() {
    return [...this.products.values()].filter(p => p.isPublished && !p.deleted);
  },

  getReportsByTarget(targetId) {
    return [...this.reports.values()].filter(r => r.targetId === targetId);
  },

  getThreadsByUser(userId) {
    return [...this.threads.values()].filter(
      t => t.participantA === userId || t.participantB === userId
    );
  },

  getMessagesByThread(threadId) {
    return [...this.messages.values()]
      .filter(m => m.threadId === threadId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },
};

/** @typedef {{ id:string, username:string, email:string, passwordHash:string,
 *   displayName:string, bio:string|null, avatarUrl:string|null,
 *   githubLogin:string|null, githubRepos:number, githubFollowers:number,
 *   stripeLink:string|null, trustScore:number, isSuspended:boolean,
 *   createdAt:number, updatedAt:number }} User */

/** @typedef {{ id:string, userId:string, title:string, description:string,
 *   category:string, price:number, stripeLink:string|null,
 *   thumbnailUrl:string|null, fileUrl:string|null, tags:string[],
 *   isPublished:boolean, deleted:boolean,
 *   viewCount:number, downloadCount:number,
 *   createdAt:number, updatedAt:number }} Product */


// ════════════════════════════════════════════════════════════════════════════════
//  1. AUTH — BCRYPT-STYLE HASHING (pure Node crypto, no npm)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Pure-Node password hashing via PBKDF2.
 * Compatible interface to bcrypt for easy swap-out.
 * Format: "pbkdf2:sha512:<rounds>:<salt_hex>:<hash_hex>"
 */
const PasswordHasher = {
  /**
   * Hash a plaintext password.
   * @param {string} password
   * @returns {Promise<string>} stored hash string
   */
  async hash(password) {
    const salt    = crypto.randomBytes(32).toString('hex');
    const rounds  = CONFIG.BCRYPT_ROUNDS * 1000; // PBKDF2 iterations
    const keylen  = 64;
    const digest  = 'sha512';

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, rounds, keylen, digest, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`pbkdf2:${digest}:${rounds}:${salt}:${derivedKey.toString('hex')}`);
      });
    });
  },

  /**
   * Compare plaintext to stored hash.
   * @param {string} password
   * @param {string} storedHash
   * @returns {Promise<boolean>}
   */
  async compare(password, storedHash) {
    const [, digest, roundsStr, salt, expected] = storedHash.split(':');
    const rounds = parseInt(roundsStr);
    const keylen = Buffer.from(expected, 'hex').length;

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, rounds, keylen, digest, (err, derivedKey) => {
        if (err) return reject(err);
        // Constant-time comparison to prevent timing attacks
        const derived = derivedKey.toString('hex');
        try {
          resolve(crypto.timingSafeEqual(
            Buffer.from(derived, 'hex'),
            Buffer.from(expected, 'hex')
          ));
        } catch {
          resolve(false);
        }
      });
    });
  },
};

// ─── JWT (HS256, pure crypto) ─────────────────────────────────────────────────

const JWT = {
  /**
   * Sign a payload into a JWT.
   * @param {object} payload
   * @param {number} [expiresInSeconds]
   * @returns {string}
   */
  sign(payload, expiresInSeconds = CONFIG.TOKEN_TTL_S) {
    const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body    = Buffer.from(JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    })).toString('base64url');
    const sig = crypto
      .createHmac('sha256', CONFIG.JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${sig}`;
  },

  /**
   * Verify and decode a JWT. Returns payload or throws.
   * @param {string} token
   * @returns {object}
   */
  verify(token) {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed token');
    const [header, body, sig] = parts;
    const expected = crypto
      .createHmac('sha256', CONFIG.JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    // Constant-time compare
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
      throw new Error('Invalid signature');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000))
      throw new Error('Token expired');
    return payload;
  },
};

// ─── Auth Module ──────────────────────────────────────────────────────────────

const Auth = {
  /**
   * Register a new user.
   * Input:  { username, email, password, displayName? }
   * Output: { user, token }
   */
  async register({ username, email, password, displayName }) {
    // Validation
    if (!username || username.length < 3)
      throw new ApiError(400, 'Username must be at least 3 characters');
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      throw new ApiError(400, 'Username may only contain letters, numbers, and underscores');
    if (!email || !email.includes('@'))
      throw new ApiError(400, 'Valid email required');
    if (!password || password.length < 8)
      throw new ApiError(400, 'Password must be at least 8 characters');

    if (db.findUserByUsername(username))
      throw new ApiError(409, 'Username already taken');
    if (db.findUserByEmail(email))
      throw new ApiError(409, 'Email already registered');

    const passwordHash = await PasswordHasher.hash(password);
    const now = Date.now();
    const user = {
      id:              db.nextId(),
      username:        username.trim(),
      email:           email.toLowerCase().trim(),
      passwordHash,
      displayName:     (displayName || username).trim(),
      bio:             null,
      avatarUrl:       null,
      githubLogin:     null,
      githubRepos:     0,
      githubFollowers: 0,
      stripeLink:      null,
      trustScore:      0,
      isSuspended:     false,
      createdAt:       now,
      updatedAt:       now,
    };

    db.users.set(user.id, user);

    // Initial trust score calculation (new account, mostly empty)
    await Scoring.recalculate(user.id);

    const token = JWT.sign({ sub: user.id, username: user.username });
    return { user: Auth._sanitize(user), token };
  },

  /**
   * Login with email or username + password.
   * Input:  { login (email or username), password }
   * Output: { user, token }
   */
  async login({ login, password }) {
    if (!login || !password)
      throw new ApiError(400, 'Login and password required');

    const user = login.includes('@')
      ? db.findUserByEmail(login)
      : db.findUserByUsername(login);

    if (!user) throw new ApiError(401, 'Invalid credentials');

    const ok = await PasswordHasher.compare(password, user.passwordHash);
    if (!ok) throw new ApiError(401, 'Invalid credentials');

    if (user.isSuspended) throw new ApiError(403, 'Account suspended');

    const token = JWT.sign({ sub: user.id, username: user.username });
    return { user: Auth._sanitize(user), token };
  },

  /**
   * Verify Bearer token from Authorization header.
   * Returns decoded { sub, username } or throws.
   * @param {http.IncomingMessage} req
   * @returns {{ sub: string, username: string }}
   */
  requireAuth(req) {
    const authHeader = req.headers['authorization'] || '';
    // Support both "Bearer <token>" and cookie-based token
    let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      const cookies = parseCookies(req);
      token = cookies['kyro_token'] || null;
    }
    if (!token) throw new ApiError(401, 'Authentication required');
    try {
      return JWT.verify(token);
    } catch (e) {
      throw new ApiError(401, `Invalid token: ${e.message}`);
    }
  },

  /**
   * Optional auth — returns payload or null (no throw).
   * @param {http.IncomingMessage} req
   * @returns {object|null}
   */
  optionalAuth(req) {
    try { return Auth.requireAuth(req); }
    catch { return null; }
  },

  /**
   * Remove sensitive fields before sending to client.
   * @param {User} user
   * @returns {object}
   */
  _sanitize(user) {
    const { passwordHash, ...safe } = user;
    return safe;
  },

  /**
   * Change password.
   * Input:  userId, { currentPassword, newPassword }
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = db.users.get(userId);
    if (!user) throw new ApiError(404, 'User not found');
    const ok = await PasswordHasher.compare(currentPassword, user.passwordHash);
    if (!ok) throw new ApiError(401, 'Current password incorrect');
    if (!newPassword || newPassword.length < 8)
      throw new ApiError(400, 'New password must be at least 8 characters');
    user.passwordHash = await PasswordHasher.hash(newPassword);
    user.updatedAt = Date.now();
    db.users.set(userId, user);
    return { ok: true };
  },

  /**
   * Update profile fields (displayName, bio, avatarUrl, stripeLink).
   * Input:  userId, fields
   */
  async updateProfile(userId, fields) {
    const user = db.users.get(userId);
    if (!user) throw new ApiError(404, 'User not found');
    const allowed = ['displayName', 'bio', 'avatarUrl', 'stripeLink'];
    for (const k of allowed) {
      if (fields[k] !== undefined) user[k] = fields[k];
    }
    user.updatedAt = Date.now();
    db.users.set(userId, user);
    await Scoring.recalculate(userId);
    return { user: Auth._sanitize(db.users.get(userId)) };
  },
};

// ─── GitHub OAuth ─────────────────────────────────────────────────────────────

const GithubAuth = {
  _pendingStates: new Map(), // state -> userId

  /**
   * Begin OAuth — generate authorization URL.
   * @param {string} userId  – currently logged-in user
   * @returns {string} redirect URL
   */
  getAuthUrl(userId) {
    if (!CONFIG.GITHUB_CLIENT_ID) throw new ApiError(503, 'GitHub OAuth not configured');
    const state = crypto.randomBytes(16).toString('hex');
    GithubAuth._pendingStates.set(state, { userId, createdAt: Date.now() });
    // Clean up old states
    for (const [s, v] of GithubAuth._pendingStates)
      if (Date.now() - v.createdAt > 600_000) GithubAuth._pendingStates.delete(s);
    return `https://github.com/login/oauth/authorize?client_id=${CONFIG.GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(CONFIG.BASE_URL + '/api/auth/github/callback')}` +
      `&scope=read:user&state=${state}`;
  },

  /**
   * Handle callback — exchange code, fetch GitHub user, update local user.
   * @param {string} code
   * @param {string} state
   * @returns {User}
   */
  async handleCallback(code, state) {
    const pending = GithubAuth._pendingStates.get(state);
    if (!pending) throw new ApiError(400, 'Invalid or expired OAuth state');
    GithubAuth._pendingStates.delete(state);

    // Exchange code for access token
    const tokenData = await httpsPost('https://github.com/login/oauth/access_token', {
      client_id:     CONFIG.GITHUB_CLIENT_ID,
      client_secret: CONFIG.GITHUB_CLIENT_SECRET,
      code,
    }, { Accept: 'application/json' });

    if (!tokenData.access_token) throw new ApiError(502, 'GitHub token exchange failed');

    // Fetch GitHub profile
    const ghUser = await httpsGet('https://api.github.com/user', {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent':  'Kyro/1.0',
    });

    const user = db.users.get(pending.userId);
    if (!user) throw new ApiError(404, 'User not found');

    user.githubLogin     = ghUser.login;
    user.githubRepos     = ghUser.public_repos     || 0;
    user.githubFollowers = ghUser.followers         || 0;
    user.avatarUrl       = user.avatarUrl || ghUser.avatar_url;
    user.updatedAt       = Date.now();
    db.users.set(user.id, user);

    await Scoring.recalculate(user.id);
    return Auth._sanitize(db.users.get(user.id));
  },
};


// ════════════════════════════════════════════════════════════════════════════════
//  2. DEVELOPER SCORING SYSTEM
// ════════════════════════════════════════════════════════════════════════════════

const Scoring = {
  /**
   * Full trust score formula.
   * Maximum possible: 100 points.
   *
   * Breakdown:
   *   GitHub presence:    0–25 pts  (connection + repos + followers)
   *   Product quality:    0–20 pts  (avg rating across all products)
   *   Publish activity:   0–20 pts  (number of live products, capped)
   *   Engagement:         0–15 pts  (total views + downloads across products)
   *   Profile complete:   0–12 pts  (bio, avatar, stripe, display name)
   *   Penalty deduction:  0–(–20)   (reports against user)
   *
   * @param {string} userId
   * @returns {number} 0–100
   */
  async recalculate(userId) {
    const user     = db.users.get(userId);
    if (!user) return 0;

    const products = db.getProductsByUser(userId).filter(p => p.isPublished);
    const reports  = db.getReportsByTarget(userId).filter(r => r.targetType === 'user' && r.upheld);

    // ── Component 1: GitHub (0–25) ──────────────────────────
    let github = 0;
    if (user.githubLogin) {
      github += 15;                                         // connected
      github += Math.min(user.githubRepos * 0.3, 6);       // up to 6 for repos
      github += Math.min(user.githubFollowers * 0.05, 4);  // up to 4 for followers
    }
    github = Math.min(Math.round(github), 25);

    // ── Component 2: Product quality via ratings (0–20) ─────
    let quality = 0;
    if (products.length > 0) {
      const allRatings = products.flatMap(p => {
        const entries = [];
        for (const [key, r] of db.ratings)
          if (key.startsWith(p.id + ':')) entries.push(r.score);
        return entries;
      });
      if (allRatings.length > 0) {
        const avg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
        quality = Math.round(((avg - 1) / 4) * 20); // normalize 1–5 → 0–20
      }
    }
    quality = Math.min(quality, 20);

    // ── Component 3: Activity (0–20) ────────────────────────
    // Logarithmic so you can't spam products for score
    const activity = Math.min(Math.round(Math.log2(products.length + 1) * 8), 20);

    // ── Component 4: Engagement (0–15) ──────────────────────
    const totalViews     = products.reduce((s, p) => s + p.viewCount, 0);
    const totalDownloads = products.reduce((s, p) => s + p.downloadCount, 0);
    // log scale: 1000 views = ~5 pts, 10k views = ~8 pts
    const engagement = Math.min(
      Math.round(Math.log10(totalViews + 1) * 3) +
      Math.round(Math.log10(totalDownloads + 1) * 4),
      15
    );

    // ── Component 5: Profile completeness (0–12) ────────────
    let profile = 0;
    if (user.bio         && user.bio.trim().length > 10)  profile += 3;
    if (user.avatarUrl)                                    profile += 3;
    if (user.stripeLink)                                   profile += 4;
    if (user.displayName !== user.username)                profile += 2;
    profile = Math.min(profile, 12);

    // ── Penalty: reports (0 to –20) ─────────────────────────
    const penalty = Math.min(reports.length * 4, 20);

    const raw = github + quality + activity + engagement + profile - penalty;
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    user.trustScore = score;
    user.updatedAt  = Date.now();
    db.users.set(userId, user);

    return score;
  },

  /**
   * Calculate score for a single product (used in ranking).
   * Returns a floating point rank score — higher = more prominent.
   *
   * Formula weights:
   *   - Avg rating (1–5)          × 20
   *   - Rating count (confidence) × 5  (log scale)
   *   - View count                × 2  (log scale)
   *   - Download count            × 8  (log scale)
   *   - Recency bonus             × 10 (decays over SCORE_DECAY_DAYS)
   *   - Report penalty            × 5  per upheld report
   *
   * @param {Product} product
   * @returns {number}
   */
  productScore(product) {
    const ratings = [];
    for (const [key, r] of db.ratings)
      if (key.startsWith(product.id + ':')) ratings.push(r.score);

    const avgRating   = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const ratingConf  = Math.log2(ratings.length + 1);
    const viewScore   = Math.log10(product.viewCount + 1);
    const dlScore     = Math.log10(product.downloadCount + 1);

    // Recency: score decays linearly over SCORE_DECAY_DAYS
    const ageMs      = Date.now() - product.createdAt;
    const ageDays    = ageMs / (1000 * 60 * 60 * 24);
    const recency    = Math.max(0, 1 - ageDays / CONFIG.SCORE_DECAY_DAYS);

    const upheldReports = db.getReportsByTarget(product.id)
      .filter(r => r.targetType === 'product' && r.upheld).length;

    return (avgRating   * 20)
         + (ratingConf  * 5)
         + (viewScore   * 2)
         + (dlScore     * 8)
         + (recency     * 10)
         - (upheldReports * 5);
  },

  /**
   * Trending score — uses recent view velocity within TRENDING_WINDOW_MS.
   * @param {string} productId
   * @returns {number}
   */
  trendingScore(productId) {
    const cutoff = Date.now() - CONFIG.TRENDING_WINDOW_MS;
    const views  = db.views.get(productId) || [];
    const recent = views.filter(v => v.ts >= cutoff).length;
    const product = db.products.get(productId);
    if (!product) return 0;
    // Blend recent velocity with all-time quality
    return (recent * 3) + Scoring.productScore(product);
  },

  /**
   * Rate a product (1–5 stars).
   * One rating per user per product (updates existing).
   * @param {string} productId
   * @param {string} userId
   * @param {number} score  1–5
   */
  async rateProduct(productId, userId, score) {
    if (score < 1 || score > 5 || !Number.isInteger(score))
      throw new ApiError(400, 'Score must be integer 1–5');
    const product = db.products.get(productId);
    if (!product || product.deleted) throw new ApiError(404, 'Product not found');
    if (product.userId === userId) throw new ApiError(403, 'Cannot rate your own product');

    const key = `${productId}:${userId}`;
    db.ratings.set(key, { score, createdAt: Date.now(), updatedAt: Date.now() });

    // Recalculate owner trust score
    await Scoring.recalculate(product.userId);
    return { ok: true, newAvg: Scoring._avgRating(productId) };
  },

  /** @param {string} productId @returns {number} */
  _avgRating(productId) {
    const scores = [];
    for (const [key, r] of db.ratings)
      if (key.startsWith(productId + ':')) scores.push(r.score);
    return scores.length === 0 ? 0
      : +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  },

  /** Get full label for a trust score. */
  label(score) {
    if (score >= 80) return 'Verified';
    if (score >= 50) return 'Trusted';
    if (score >= 20) return 'Active';
    return 'New';
  },
};


// ════════════════════════════════════════════════════════════════════════════════
//  3. MARKETPLACE RANKING
// ════════════════════════════════════════════════════════════════════════════════

const VALID_SORTS   = ['trending', 'top', 'newest', 'price-asc', 'price-desc'];
const VALID_CATS    = [
  'Starter Kit', 'API Template', 'Component Library', 'Template',
  'CLI Tool', 'Automation', 'Script', 'Other',
];

const Marketplace = {
  /**
   * Get ranked product listing.
   *
   * Input:
   *   { category?, sort?, q?, page?, limit?, minPrice?, maxPrice? }
   * Output:
   *   { products: Product[], total: number, page: number, pages: number }
   *
   * @param {object} opts
   */
  async list(opts = {}) {
    const {
      category  = null,
      sort      = 'trending',
      q         = null,
      page      = 1,
      limit     = 20,
      minPrice  = null,
      maxPrice  = null,
    } = opts;

    if (!VALID_SORTS.includes(sort))
      throw new ApiError(400, `sort must be one of: ${VALID_SORTS.join(', ')}`);

    let products = db.getPublishedProducts();

    // ── Filter: category ──────────────────────────────────────
    if (category && category !== 'all') {
      if (!VALID_CATS.includes(category))
        throw new ApiError(400, 'Invalid category');
      products = products.filter(p => p.category === category);
    }

    // ── Filter: price range ───────────────────────────────────
    if (minPrice !== null) products = products.filter(p => p.price >= Number(minPrice));
    if (maxPrice !== null) products = products.filter(p => p.price <= Number(maxPrice));

    // ── Filter: suspended users ───────────────────────────────
    products = products.filter(p => {
      const u = db.users.get(p.userId);
      return u && !u.isSuspended;
    });

    // ── Search ────────────────────────────────────────────────
    if (q && q.trim()) {
      products = Search.filter(products, q);
    }

    // ── Sort ─────────────────────────────────────────────────
    switch (sort) {
      case 'trending':
        products.sort((a, b) => Scoring.trendingScore(b.id) - Scoring.trendingScore(a.id));
        break;
      case 'top':
        products.sort((a, b) => Scoring.productScore(b) - Scoring.productScore(a));
        break;
      case 'newest':
        products.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'price-asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        products.sort((a, b) => b.price - a.price);
        break;
    }

    // ── Paginate ──────────────────────────────────────────────
    const pageN  = Math.max(1, parseInt(page));
    const limitN = Math.min(50, Math.max(1, parseInt(limit)));
    const total  = products.length;
    const pages  = Math.ceil(total / limitN);
    const slice  = products.slice((pageN - 1) * limitN, pageN * limitN);

    // Attach computed fields
    const enriched = slice.map(p => Marketplace._enrich(p));

    return { products: enriched, total, page: pageN, pages };
  },

  /**
   * Record a product view (for trending calculation).
   * Deduplicates views within a 1-hour window per visitor.
   * @param {string} productId
   * @param {string} visitorId  — userId or IP string
   */
  recordView(productId, visitorId) {
    const product = db.products.get(productId);
    if (!product || !product.isPublished) return;

    const views  = db.views.get(productId) || [];
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
    const recent = views.filter(v => v.visitorId === visitorId && v.ts > cutoff);

    if (recent.length === 0) {
      views.push({ visitorId, ts: Date.now() });
      db.views.set(productId, views);
      product.viewCount++;
      db.products.set(productId, product);
    }
  },

  /** Attach computed fields to a product for API responses. */
  _enrich(product) {
    const owner  = db.users.get(product.userId);
    const avgRating = Scoring._avgRating(product.id);
    const ratingCount = [...db.ratings.keys()].filter(k => k.startsWith(product.id + ':')).length;
    return {
      ...product,
      avgRating,
      ratingCount,
      rankScore:    +Scoring.productScore(product).toFixed(2),
      trendScore:   +Scoring.trendingScore(product.id).toFixed(2),
      owner: owner ? {
        id:          owner.id,
        username:    owner.username,
        displayName: owner.displayName,
        avatarUrl:   owner.avatarUrl,
        trustScore:  owner.trustScore,
        trustLabel:  Scoring.label(owner.trustScore),
      } : null,
    };
  },
};


// ════════════════════════════════════════════════════════════════════════════════
//  4. PRODUCT MANAGEMENT (CRUD)
// ════════════════════════════════════════════════════════════════════════════════

const Products = {
  /**
   * Create a new product.
   * Input:  userId, { title, description, category, price, stripeLink?,
   *                   thumbnailUrl?, fileUrl?, tags? }
   * Output: Product
   */
  async create(userId, data) {
    const user = db.users.get(userId);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.isSuspended) throw new ApiError(403, 'Account suspended');

    Products._validate(data);

    const now     = Date.now();
    const product = {
      id:            db.nextId(),
      userId,
      title:         data.title.trim(),
      description:   (data.description || '').trim(),
      category:      data.category,
      price:         Math.max(0, parseFloat(data.price) || 0),
      stripeLink:    data.stripeLink    || null,
      thumbnailUrl:  data.thumbnailUrl  || null,
      fileUrl:       data.fileUrl       || null,
      tags:          Array.isArray(data.tags)
                       ? data.tags.map(t => t.trim().toLowerCase()).filter(Boolean)
                       : [],
      isPublished:   data.isPublished !== undefined ? Boolean(data.isPublished) : true,
      deleted:       false,
      viewCount:     0,
      downloadCount: 0,
      createdAt:     now,
      updatedAt:     now,
    };

    db.products.set(product.id, product);
    await Scoring.recalculate(userId);

    return Marketplace._enrich(product);
  },

  /**
   * Get a single product by ID.
   * @param {string} id
   * @param {string|null} viewerId  — for view tracking
   */
  async getById(id, viewerId = null) {
    const product = db.products.get(id);
    if (!product || product.deleted)
      throw new ApiError(404, 'Product not found');
    if (!product.isPublished) {
      // Only owner can see unpublished
      if (viewerId !== product.userId)
        throw new ApiError(404, 'Product not found');
    }
    if (viewerId && viewerId !== product.userId) {
      Marketplace.recordView(id, viewerId);
    }
    return Marketplace._enrich(product);
  },

  /**
   * Update a product. Only owner may update.
   * Input:  productId, userId, fields (partial)
   */
  async update(productId, userId, fields) {
    const product = db.products.get(productId);
    if (!product || product.deleted) throw new ApiError(404, 'Product not found');
    if (product.userId !== userId) throw new ApiError(403, 'Not your product');

    const allowed = ['title', 'description', 'category', 'price',
                     'stripeLink', 'thumbnailUrl', 'fileUrl', 'tags', 'isPublished'];
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        if (k === 'price')  product.price = Math.max(0, parseFloat(fields[k]) || 0);
        else if (k === 'tags') product.tags = Array.isArray(fields[k])
          ? fields[k].map(t => t.trim().toLowerCase()).filter(Boolean) : product.tags;
        else product[k] = fields[k];
      }
    }
    product.updatedAt = Date.now();

    // Re-validate after update
    if (fields.title || fields.category) Products._validate(product);

    db.products.set(productId, product);
    await Scoring.recalculate(userId);
    return Marketplace._enrich(product);
  },

  /**
   * Soft-delete a product. Only owner may delete.
   * @param {string} productId
   * @param {string} userId
   */
  async delete(productId, userId) {
    const product = db.products.get(productId);
    if (!product || product.deleted) throw new ApiError(404, 'Product not found');
    if (product.userId !== userId) throw new ApiError(403, 'Not your product');
    product.deleted    = true;
    product.isPublished = false;
    product.updatedAt   = Date.now();
    db.products.set(productId, product);
    await Scoring.recalculate(userId);
    return { ok: true };
  },

  /**
   * Record a download (increments counter).
   * @param {string} productId
   * @param {string} userId
   */
  recordDownload(productId, userId) {
    const product = db.products.get(productId);
    if (!product || !product.isPublished || product.deleted) return;
    product.downloadCount++;
    product.updatedAt = Date.now();
    db.products.set(productId, product);
  },

  _validate(data) {
    if (!data.title || data.title.trim().length < 3)
      throw new ApiError(400, 'Title must be at least 3 characters');
    if (data.title.trim().length > 100)
      throw new ApiError(400, 'Title must be 100 characters or fewer');
    if (data.category && !VALID_CATS.includes(data.category))
      throw new ApiError(400, `Category must be one of: ${VALID_CATS.join(', ')}`);
  },
};


// ════════════════════════════════════════════════════════════════════════════════
//  5. DEVELOPER STOREFRONTS
// ════════════════════════════════════════════════════════════════════════════════

const Storefronts = {
  /**
   * Get a public developer storefront by username.
   * Input:  username, { sort?, category?, viewerId? }
   * Output: { user, products, stats }
   */
  async getByUsername(username, opts = {}) {
    const user = db.findUserByUsername(username);
    if (!user) throw new ApiError(404, 'Developer not found');
    if (user.isSuspended) throw new ApiError(404, 'Developer not found');

    const { sort = 'top', category = null, viewerId = null } = opts;

    let products = db.getProductsByUser(user.id)
      .filter(p => p.isPublished);

    if (category) products = products.filter(p => p.category === category);

    // Sort storefront products
    switch (sort) {
      case 'trending':
        products.sort((a, b) => Scoring.trendingScore(b.id) - Scoring.trendingScore(a.id));
        break;
      case 'newest':
        products.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'top':
      default:
        products.sort((a, b) => Scoring.productScore(b) - Scoring.productScore(a));
    }

    const enriched = products.map(p => {
      if (viewerId && viewerId !== user.id) Marketplace.recordView(p.id, viewerId);
      return Marketplace._enrich(p);
    });

    const stats = Storefronts._calcStats(user.id, products);

    return {
      user: {
        ...Auth._sanitize(user),
        trustLabel: Scoring.label(user.trustScore),
      },
      products: enriched,
      stats,
    };
  },

  /**
   * Calculate aggregate stats for a storefront.
   * @param {string} userId
   * @param {Product[]} products
   */
  _calcStats(userId, products) {
    const totalViews     = products.reduce((s, p) => s + p.viewCount,     0);
    const totalDownloads = products.reduce((s, p) => s + p.downloadCount, 0);

    // Avg rating across all rated products
    const allScores = products.flatMap(p => {
      const scores = [];
      for (const [key, r] of db.ratings)
        if (key.startsWith(p.id + ':')) scores.push(r.score);
      return scores;
    });
    const avgRating = allScores.length > 0
      ? +(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
      : null;

    const categories = [...new Set(products.map(p => p.category))];
    const freeCount  = products.filter(p => p.price === 0).length;
    const paidCount  = products.filter(p => p.price > 0).length;

    return {
      productCount:   products.length,
      totalViews,
      totalDownloads,
      avgRating,
      categories,
      freeCount,
      paidCount,
      memberSince: new Date(db.users.get(userId).createdAt).toISOString().slice(0, 10),
    };
  },
};


// ════════════════════════════════════════════════════════════════════════════════
//  6. MESSAGING SYSTEM
// ════════════════════════════════════════════════════════════════════════════════

const Messaging = {
  /**
   * Get or create a thread between two users (about an optional product).
   * Thread is identified by the pair (participantA, participantB) — order-normalised.
   * Optionally scoped to a productId.
   *
   * Input:  senderId, recipientId, productId?
   * Output: Thread
   */
  getOrCreateThread(senderId, recipientId, productId = null) {
    if (senderId === recipientId)
      throw new ApiError(400, 'Cannot message yourself');

    // Normalize participant order for dedup
    const [pA, pB] = [senderId, recipientId].sort();
    for (const t of db.threads.values()) {
      if (t.participantA === pA && t.participantB === pB) {
        if (productId === null || t.productId === productId) return t;
      }
    }

    const thread = {
      id:           db.nextId(),
      participantA: pA,
      participantB: pB,
      productId:    productId || null,
      createdAt:    Date.now(),
      updatedAt:    Date.now(),
      lastMessageAt: null,
    };
    db.threads.set(thread.id, thread);
    return thread;
  },

  /**
   * Send a message within a thread.
   *
   * Input:  threadId, senderId, { text }
   * Output: Message
   */
  sendMessage(threadId, senderId, { text }) {
    const thread = db.threads.get(threadId);
    if (!thread) throw new ApiError(404, 'Thread not found');

    const isParticipant =
      thread.participantA === senderId || thread.participantB === senderId;
    if (!isParticipant) throw new ApiError(403, 'Not a participant in this thread');

    if (!text || text.trim().length === 0)
      throw new ApiError(400, 'Message cannot be empty');
    if (text.trim().length > 4000)
      throw new ApiError(400, 'Message too long (max 4000 characters)');

    const sender = db.users.get(senderId);
    if (sender?.isSuspended) throw new ApiError(403, 'Account suspended');

    const now = Date.now();
    const message = {
      id:         db.nextId(),
      threadId,
      senderId,
      text:       text.trim(),
      readBy:     [senderId],  // sender has obviously "read" it
      createdAt:  now,
    };

    db.messages.set(message.id, message);

    // Update thread metadata
    thread.updatedAt     = now;
    thread.lastMessageAt = now;
    db.threads.set(threadId, thread);

    return message;
  },

  /**
   * Get full chat history for a thread, with pagination.
   * Input:  threadId, requestingUserId, { page?, limit? }
   * Output: { messages, thread, total }
   */
  getHistory(threadId, requestingUserId, { page = 1, limit = 50 } = {}) {
    const thread = db.threads.get(threadId);
    if (!thread) throw new ApiError(404, 'Thread not found');

    const isParticipant =
      thread.participantA === requestingUserId ||
      thread.participantB === requestingUserId;
    if (!isParticipant) throw new ApiError(403, 'Not a participant');

    // Mark unread messages as read
    let messages = db.getMessagesByThread(threadId);
    messages.forEach(m => {
      if (!m.readBy.includes(requestingUserId)) {
        m.readBy.push(requestingUserId);
        db.messages.set(m.id, m);
      }
    });

    const total   = messages.length;
    const pageN   = Math.max(1, parseInt(page));
    const limitN  = Math.min(100, Math.max(1, parseInt(limit)));
    const sliced  = messages
      .slice()
      .reverse() // newest first for offset, then re-reverse
      .slice((pageN - 1) * limitN, pageN * limitN)
      .reverse();

    return { messages: sliced, thread, total, page: pageN };
  },

  /**
   * List all threads for a user, sorted by most recent message.
   * Input:  userId
   * Output: Thread[]  (with unread counts and last message preview)
   */
  listThreads(userId) {
    const threads = db.getThreadsByUser(userId);
    threads.sort((a, b) => (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt));

    return threads.map(thread => {
      const messages   = db.getMessagesByThread(thread.id);
      const lastMsg    = messages[messages.length - 1] || null;
      const unreadCount = messages.filter(
        m => !m.readBy.includes(userId) && m.senderId !== userId
      ).length;

      const otherUserId = thread.participantA === userId
        ? thread.participantB : thread.participantA;
      const otherUser   = db.users.get(otherUserId);

      return {
        ...thread,
        unreadCount,
        lastMessage: lastMsg ? {
          text:      lastMsg.text.slice(0, 80) + (lastMsg.text.length > 80 ? '…' : ''),
          senderId:  lastMsg.senderId,
          createdAt: lastMsg.createdAt,
        } : null,
        otherUser: otherUser ? {
          id:          otherUser.id,
          username:    otherUser.username,
          displayName: otherUser.displayName,
          avatarUrl:   otherUser.avatarUrl,
        } : null,
      };
    });
  },

  /**
   * Delete (soft-delete) a message. Only sender may delete.
   * @param {string} messageId
   * @param {string} requestingUserId
   */
  deleteMessage(messageId, requestingUserId) {
    const msg = db.messages.get(messageId);
    if (!msg) throw new ApiError(404, 'Message not found');
    if (msg.senderId !== requestingUserId) throw new ApiError(403, 'Not your message');
    msg.deleted = true;
    msg.text    = '[deleted]';
    db.messages.set(messageId, msg);
    return { ok: true };
  },
};


// ════════════════════════════════════════════════════════════════════════════════
//  7. REPORTS & ABUSE DETECTION
// ════════════════════════════════════════════════════════════════════════════════

const REPORT_REASONS = [
  'spam', 'copyright', 'malware', 'misleading',
  'offensive', 'broken', 'impersonation', 'other',
];

const Reports = {
  /**
   * File a report against a product or user.
   *
   * Input:  reporterId, { targetType, targetId, reason, description? }
   * Output: Report
   */
  async file(reporterId, { targetType, targetId, reason, description }) {
    if (!['product', 'user'].includes(targetType))
      throw new ApiError(400, 'targetType must be "product" or "user"');
    if (!REPORT_REASONS.includes(reason))
      throw new ApiError(400, `reason must be one of: ${REPORT_REASONS.join(', ')}`);
    if (reporterId === targetId)
      throw new ApiError(400, 'Cannot report yourself');

    // Check target exists
    if (targetType === 'product') {
      const p = db.products.get(targetId);
      if (!p || p.deleted) throw new ApiError(404, 'Product not found');
    } else {
      if (!db.users.get(targetId)) throw new ApiError(404, 'User not found');
    }

    // Deduplicate: one open report per reporter per target
    const existing = [...db.reports.values()].find(
      r => r.reporterId === reporterId && r.targetId === targetId && r.status === 'open'
    );
    if (existing) throw new ApiError(409, 'You already have an open report for this target');

    const now    = Date.now();
    const report = {
      id:          db.nextId(),
      reporterId,
      targetType,
      targetId,
      reason,
      description: (description || '').trim().slice(0, 1000),
      status:      'open',    // open | reviewed | dismissed
      upheld:      false,
      createdAt:   now,
      updatedAt:   now,
    };

    db.reports.set(report.id, report);

    // Auto-process based on report count
    await Reports._autoProcess(targetType, targetId);

    return report;
  },

  /**
   * Admin: review a report (uphold or dismiss).
   * @param {string} reportId
   * @param {'upheld'|'dismissed'} decision
   * @param {string} adminId
   */
  async review(reportId, decision, adminId) {
    const report = db.reports.get(reportId);
    if (!report) throw new ApiError(404, 'Report not found');
    if (!['upheld', 'dismissed'].includes(decision))
      throw new ApiError(400, 'Decision must be "upheld" or "dismissed"');

    report.status   = 'reviewed';
    report.upheld   = decision === 'upheld';
    report.reviewedBy = adminId;
    report.updatedAt  = Date.now();
    db.reports.set(reportId, report);

    if (report.upheld) {
      // Apply penalties
      if (report.targetType === 'product') {
        // Product penalty: remove from published if too many upheld reports
        const product      = db.products.get(report.targetId);
        const upheldCount  = db.getReportsByTarget(report.targetId)
          .filter(r => r.targetType === 'product' && r.upheld).length;
        if (product && upheldCount >= 3) {
          product.isPublished = false;
          product.updatedAt   = Date.now();
          db.products.set(product.id, product);
        }
        await Scoring.recalculate(product?.userId);
      } else {
        // User penalty: recalculate score (penalty included in formula)
        await Scoring.recalculate(report.targetId);
        // Suspend if enough upheld reports
        const upheldCount = db.getReportsByTarget(report.targetId)
          .filter(r => r.targetType === 'user' && r.upheld).length;
        if (upheldCount >= CONFIG.MAX_REPORTS_BEFORE_SUSPEND) {
          const user       = db.users.get(report.targetId);
          if (user) {
            user.isSuspended = true;
            user.updatedAt   = Date.now();
            db.users.set(user.id, user);
          }
        }
      }
    }

    return report;
  },

  /**
   * Auto-process: if a target accumulates many open reports,
   * temporarily reduce its visibility without admin intervention.
   * @param {'product'|'user'} targetType
   * @param {string} targetId
   */
  async _autoProcess(targetType, targetId) {
    const openCount = db.getReportsByTarget(targetId)
      .filter(r => r.status === 'open').length;

    if (targetType === 'product' && openCount >= 10) {
      // Auto-hide pending review
      const product = db.products.get(targetId);
      if (product && product.isPublished) {
        product.isPublished   = false;
        product._autoHidden   = true;
        product.updatedAt     = Date.now();
        db.products.set(targetId, product);
      }
    }

    if (targetType === 'user') {
      await Scoring.recalculate(targetId); // score penalty kicks in
    }
  },

  /**
   * List reports (admin view).
   * @param {{ status?, targetType?, page?, limit? }} opts
   */
  list(opts = {}) {
    const { status = null, targetType = null, page = 1, limit = 20 } = opts;
    let reports = [...db.reports.values()];
    if (status)     reports = reports.filter(r => r.status === status);
    if (targetType) reports = reports.filter(r => r.targetType === targetType);
    reports.sort((a, b) => b.createdAt - a.createdAt);
    const pageN  = Math.max(1, parseInt(page));
    const limitN = Math.min(100, parseInt(limit));
    return {
      reports: reports.slice((pageN - 1) * limitN, pageN * limitN),
      total:   reports.length,
      page:    pageN,
    };
  },
};


// ════════════════════════════════════════════════════════════════════════════════
//  8. SEARCH & FILTERS
// ════════════════════════════════════════════════════════════════════════════════

const Search = {
  /**
   * Full-text search across product title, description, and tags.
   * Returns products sorted by relevance score.
   *
   * Scoring:
   *   - Title exact match:      50 pts
   *   - Title word match:       10 pts per word
   *   - Tag match:              15 pts per tag
   *   - Description word match:  3 pts per word
   *
   * @param {Product[]} products  — pre-filtered pool
   * @param {string} q
   * @returns {Product[]} sorted by relevance
   */
  filter(products, q) {
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return products;

    const scored = products.map(p => {
      let score = 0;
      const titleLower = p.title.toLowerCase();
      const descLower  = p.description.toLowerCase();

      // Exact title match
      if (titleLower === terms.join(' ')) score += 50;

      // Per-term title hits
      for (const term of terms) {
        if (titleLower.includes(term))       score += 10;
        if (descLower.includes(term))        score += 3;
        for (const tag of p.tags)
          if (tag.includes(term))            score += 15;
      }

      return { product: p, relevance: score };
    }).filter(x => x.relevance > 0);

    scored.sort((a, b) => b.relevance - a.relevance);
    return scored.map(x => x.product);
  },

  /**
   * Autocomplete suggestions — return up to 8 matching product titles and user handles.
   * Input:  q (partial string)
   * Output: { products: string[], users: string[] }
   */
  autocomplete(q) {
    if (!q || q.trim().length < 2) return { products: [], users: [] };
    const ql = q.toLowerCase();

    const productTitles = db.getPublishedProducts()
      .filter(p => p.title.toLowerCase().includes(ql))
      .slice(0, 8)
      .map(p => ({ id: p.id, title: p.title, category: p.category }));

    const users = [...db.users.values()]
      .filter(u => !u.isSuspended && (
        u.username.toLowerCase().includes(ql) ||
        u.displayName.toLowerCase().includes(ql)
      ))
      .slice(0, 4)
      .map(u => ({ id: u.id, username: u.username, displayName: u.displayName }));

    return { products: productTitles, users };
  },

  /**
   * Get available filter facets for the current result set.
   * (Category counts, price range, tag cloud)
   * @param {Product[]} products
   */
  facets(products) {
    const categoryCounts = {};
    const tagCounts      = {};
    let minPrice = Infinity, maxPrice = -Infinity;

    for (const p of products) {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
      for (const tag of p.tags)
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      if (p.price < minPrice) minPrice = p.price;
      if (p.price > maxPrice) maxPrice = p.price;
    }

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    return {
      categories: Object.entries(categoryCounts).map(([name, count]) => ({ name, count })),
      topTags,
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === -Infinity ? 0 : maxPrice,
      },
    };
  },
};


// ════════════════════════════════════════════════════════════════════════════════
//  9. ANALYTICS
// ════════════════════════════════════════════════════════════════════════════════

const Analytics = {
  /**
   * Per-user analytics dashboard.
   * Input:  userId
   * Output: comprehensive stats object
   */
  async userStats(userId) {
    const user = db.users.get(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const products     = db.getProductsByUser(userId).filter(p => !p.deleted);
    const published    = products.filter(p => p.isPublished);
    const unpublished  = products.filter(p => !p.isPublished);

    const totalViews     = products.reduce((s, p) => s + p.viewCount,     0);
    const totalDownloads = products.reduce((s, p) => s + p.downloadCount, 0);

    // Ratings analysis
    const allRatingEntries = products.flatMap(p => {
      const r = [];
      for (const [key, v] of db.ratings)
        if (key.startsWith(p.id + ':')) r.push({ product: p, ...v });
      return r;
    });
    const avgRating = allRatingEntries.length > 0
      ? +(allRatingEntries.reduce((s, r) => s + r.score, 0) / allRatingEntries.length).toFixed(2)
      : null;

    // Trending product (highest trend score)
    const trendingProduct = published.length > 0
      ? published.reduce((best, p) =>
          Scoring.trendingScore(p.id) > Scoring.trendingScore(best.id) ? p : best
        )
      : null;

    // Category breakdown
    const byCategory = {};
    for (const p of published)
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;

    // Views over time (last 30 days, per day)
    const viewTimeline = Analytics._viewTimeline(products, 30);

    // Reports about this user's content
    const reportsReceived = [...db.reports.values()]
      .filter(r => r.targetId === userId || products.some(p => p.id === r.targetId)).length;

    return {
      user: {
        id:          user.id,
        username:    user.username,
        trustScore:  user.trustScore,
        trustLabel:  Scoring.label(user.trustScore),
        memberSince: new Date(user.createdAt).toISOString().slice(0, 10),
      },
      products: {
        total:        products.length,
        published:    published.length,
        unpublished:  unpublished.length,
        byCategory,
      },
      engagement: {
        totalViews,
        totalDownloads,
        avgRating,
        ratingCount:  allRatingEntries.length,
        trendingProductId: trendingProduct?.id || null,
      },
      reportsReceived,
      viewTimeline,
    };
  },

  /**
   * Platform-wide analytics (admin).
   */
  async platformStats() {
    const users       = [...db.users.values()];
    const products    = [...db.products.values()].filter(p => !p.deleted);
    const published   = products.filter(p => p.isPublished);
    const reports     = [...db.reports.values()];
    const messages    = [...db.messages.values()].filter(m => !m.deleted);

    const totalViews     = published.reduce((s, p) => s + p.viewCount,     0);
    const totalDownloads = published.reduce((s, p) => s + p.downloadCount, 0);

    // Top 10 products by rank score
    const topProducts = published
      .map(p => ({ ...p, score: Scoring.productScore(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => ({ id: p.id, title: p.title, score: +p.score.toFixed(2) }));

    // Top 10 users by trust score
    const topUsers = users
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, 10)
      .map(u => ({ id: u.id, username: u.username, trustScore: u.trustScore }));

    // Category distribution
    const categoryDist = {};
    for (const p of published)
      categoryDist[p.category] = (categoryDist[p.category] || 0) + 1;

    // Sign-up trend (last 30 days)
    const signupTimeline = Analytics._signupTimeline(users, 30);

    return {
      totals: {
        users:      users.length,
        products:   products.length,
        published:  published.length,
        reports:    reports.length,
        openReports: reports.filter(r => r.status === 'open').length,
        messages:   messages.length,
        totalViews,
        totalDownloads,
      },
      topProducts,
      topUsers,
      categoryDist,
      signupTimeline,
    };
  },

  /**
   * Build daily view timeline for a set of products over N days.
   * @param {Product[]} products
   * @param {number} days
   * @returns {{ date: string, views: number }[]}
   */
  _viewTimeline(products, days) {
    const buckets = {};
    const now = Date.now();
    for (let d = 0; d < days; d++) {
      const ts   = new Date(now - d * 86_400_000);
      const key  = ts.toISOString().slice(0, 10);
      buckets[key] = 0;
    }

    for (const p of products) {
      const views = db.views.get(p.id) || [];
      for (const v of views) {
        const key = new Date(v.ts).toISOString().slice(0, 10);
        if (key in buckets) buckets[key]++;
      }
    }

    return Object.entries(buckets)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Build daily sign-up timeline over N days.
   * @param {User[]} users
   * @param {number} days
   */
  _signupTimeline(users, days) {
    const buckets = {};
    const now = Date.now();
    for (let d = 0; d < days; d++) {
      const key = new Date(now - d * 86_400_000).toISOString().slice(0, 10);
      buckets[key] = 0;
    }
    for (const u of users) {
      const key = new Date(u.createdAt).toISOString().slice(0, 10);
      if (key in buckets) buckets[key]++;
    }
    return Object.entries(buckets)
      .map(([date, signups]) => ({ date, signups }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
};


// ════════════════════════════════════════════════════════════════════════════════
//  HTTP SERVER — ROUTING
// ════════════════════════════════════════════════════════════════════════════════

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k.trim()] = decodeURIComponent(v.join('='));
  }
  return out;
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type':  'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function sendHTML(res, filePath) {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

function redirect(res, loc) {
  res.writeHead(302, { Location: loc }); res.end();
}

/**
 * Read and parse JSON body from request.
 * @param {http.IncomingMessage} req
 * @returns {Promise<object>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > CONFIG.MAX_FILE_SIZE_BYTES)
        return reject(new ApiError(413, 'Request body too large'));
      data += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { reject(new ApiError(400, 'Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    }).on('error', reject);
  });
}

function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const post = typeof body === 'string' ? body : new URLSearchParams(body).toString();
    const opts = {
      hostname: u.hostname, path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(post),
        Accept: 'application/json', 'User-Agent': 'Kyro/1.0',
        ...headers,
      },
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on('error', reject); req.write(post); req.end();
  });
}

// ─── Route table ──────────────────────────────────────────────────────────────

/**
 * Main request dispatcher.
 * Routes are matched in order. Dynamic params extracted via regex.
 */
async function handleRequest(req, res) {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';
  const method   = req.method.toUpperCase();
  const query    = parsed.query;

  // ── CORS preflight ────────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  STATIC FILES
  // ══════════════════════════════════════════════════════════════════════════

  if (method === 'GET') {
    if (pathname === '/' || pathname === '/index.html')
      return sendHTML(res, 'index.html');
    if (pathname === '/app'  || pathname === '/app.html')
      return sendHTML(res, 'app.html');
    if (pathname === '/login' || pathname === '/login.html')
      return sendHTML(res, 'login.html');
    if (pathname === '/pricing' || pathname === '/pricing.html')
      return sendHTML(res, 'pricing.html');
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  AUTH ROUTES
  // ══════════════════════════════════════════════════════════════════════════

  //  POST /api/auth/register
  if (method === 'POST' && pathname === '/api/auth/register') {
    const body   = await readBody(req);
    const result = await Auth.register(body);
    return sendJSON(res, 201, result);
  }

  //  POST /api/auth/login
  if (method === 'POST' && pathname === '/api/auth/login') {
    const body   = await readBody(req);
    const result = await Auth.login(body);
    return sendJSON(res, 200, result);
  }

  //  GET  /api/auth/me
  if (method === 'GET' && pathname === '/api/auth/me') {
    const { sub } = Auth.requireAuth(req);
    const user    = db.users.get(sub);
    if (!user) throw new ApiError(404, 'User not found');
    return sendJSON(res, 200, { user: Auth._sanitize(user) });
  }

  //  PATCH /api/auth/me
  if (method === 'PATCH' && pathname === '/api/auth/me') {
    const { sub } = Auth.requireAuth(req);
    const body    = await readBody(req);
    const result  = await Auth.updateProfile(sub, body);
    return sendJSON(res, 200, result);
  }

  //  POST /api/auth/change-password
  if (method === 'POST' && pathname === '/api/auth/change-password') {
    const { sub } = Auth.requireAuth(req);
    const body    = await readBody(req);
    const result  = await Auth.changePassword(sub, body);
    return sendJSON(res, 200, result);
  }

  //  GET /api/auth/github
  if (method === 'GET' && pathname === '/api/auth/github') {
    const { sub } = Auth.requireAuth(req);
    const authUrl = GithubAuth.getAuthUrl(sub);
    return redirect(res, authUrl);
  }

  //  GET /api/auth/github/callback
  if (method === 'GET' && pathname === '/api/auth/github/callback') {
    const { code, state } = query;
    const user = await GithubAuth.handleCallback(code, state);
    return redirect(res, '/app?github=connected');
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRODUCT ROUTES
  // ══════════════════════════════════════════════════════════════════════════

  //  GET /api/products — list/search
  if (method === 'GET' && pathname === '/api/products') {
    const result = await Marketplace.list({
      category:  query.category,
      sort:      query.sort,
      q:         query.q,
      page:      query.page,
      limit:     query.limit,
      minPrice:  query.minPrice,
      maxPrice:  query.maxPrice,
    });
    return sendJSON(res, 200, result);
  }

  //  POST /api/products — create
  if (method === 'POST' && pathname === '/api/products') {
    const { sub } = Auth.requireAuth(req);
    const body    = await readBody(req);
    const product = await Products.create(sub, body);
    return sendJSON(res, 201, { product });
  }

  //  GET /api/products/search/autocomplete?q=
  if (method === 'GET' && pathname === '/api/products/search/autocomplete') {
    return sendJSON(res, 200, Search.autocomplete(query.q || ''));
  }

  //  GET /api/products/:id
  let m;
  if (method === 'GET' && (m = pathname.match(/^\/api\/products\/([^/]+)$/))) {
    const auth    = Auth.optionalAuth(req);
    const product = await Products.getById(m[1], auth?.sub || null);
    return sendJSON(res, 200, { product });
  }

  //  PATCH /api/products/:id
  if (method === 'PATCH' && (m = pathname.match(/^\/api\/products\/([^/]+)$/))) {
    const { sub } = Auth.requireAuth(req);
    const body    = await readBody(req);
    const product = await Products.update(m[1], sub, body);
    return sendJSON(res, 200, { product });
  }

  //  DELETE /api/products/:id
  if (method === 'DELETE' && (m = pathname.match(/^\/api\/products\/([^/]+)$/))) {
    const { sub } = Auth.requireAuth(req);
    const result  = await Products.delete(m[1], sub);
    return sendJSON(res, 200, result);
  }

  //  POST /api/products/:id/rate
  if (method === 'POST' && (m = pathname.match(/^\/api\/products\/([^\/]+)\/rate$/))) {
    const { sub } = Auth.requireAuth(req);
    const { score } = await readBody(req);
    const result  = await Scoring.rateProduct(m[1], sub, score);
    return sendJSON(res, 200, result);
  }

  //  POST /api/products/:id/download
  if (method === 'POST' && (m = pathname.match(/^\/api\/products\/([^\/]+)\/download$/))) {
    const auth = Auth.optionalAuth(req);
    Products.recordDownload(m[1], auth?.sub || 'anon');
    return sendJSON(res, 200, { ok: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  STOREFRONT ROUTES
  // ══════════════════════════════════════════════════════════════════════════

  //  GET /api/store/:username
  if (method === 'GET' && (m = pathname.match(/^\/api\/store\/([^/]+)$/))) {
    const auth = Auth.optionalAuth(req);
    const data = await Storefronts.getByUsername(m[1], {
      sort:     query.sort,
      category: query.category,
      viewerId: auth?.sub || null,
    });
    return sendJSON(res, 200, data);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MESSAGING ROUTES
  // ══════════════════════════════════════════════════════════════════════════

  //  GET  /api/messages — list threads
  if (method === 'GET' && pathname === '/api/messages') {
    const { sub } = Auth.requireAuth(req);
    return sendJSON(res, 200, { threads: Messaging.listThreads(sub) });
  }

  //  POST /api/messages — start or get thread
  if (method === 'POST' && pathname === '/api/messages') {
    const { sub }  = Auth.requireAuth(req);
    const body     = await readBody(req);
    const thread   = Messaging.getOrCreateThread(sub, body.recipientId, body.productId);
    return sendJSON(res, 200, { thread });
  }

  //  GET  /api/messages/:threadId
  if (method === 'GET' && (m = pathname.match(/^\/api\/messages\/([^/]+)$/))) {
    const { sub } = Auth.requireAuth(req);
    const result  = Messaging.getHistory(m[1], sub, { page: query.page, limit: query.limit });
    return sendJSON(res, 200, result);
  }

  //  POST /api/messages/:threadId
  if (method === 'POST' && (m = pathname.match(/^\/api\/messages\/([^/]+)$/))) {
    const { sub } = Auth.requireAuth(req);
    const body    = await readBody(req);
    const message = Messaging.sendMessage(m[1], sub, body);
    return sendJSON(res, 201, { message });
  }

  //  DELETE /api/messages/:threadId/:messageId
  if (method === 'DELETE' && (m = pathname.match(/^\/api\/messages\/([^/]+)\/([^/]+)$/))) {
    const { sub } = Auth.requireAuth(req);
    const result  = Messaging.deleteMessage(m[2], sub);
    return sendJSON(res, 200, result);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  REPORTS ROUTES
  // ══════════════════════════════════════════════════════════════════════════

  //  POST /api/reports
  if (method === 'POST' && pathname === '/api/reports') {
    const { sub } = Auth.requireAuth(req);
    const body    = await readBody(req);
    const report  = await Reports.file(sub, body);
    return sendJSON(res, 201, { report });
  }

  //  GET  /api/reports (admin)
  if (method === 'GET' && pathname === '/api/reports') {
    Auth.requireAuth(req); // must be auth'd — add admin role check as needed
    const result = Reports.list({
      status:     query.status,
      targetType: query.targetType,
      page:       query.page,
      limit:      query.limit,
    });
    return sendJSON(res, 200, result);
  }

  //  PATCH /api/reports/:id (admin review)
  if (method === 'PATCH' && (m = pathname.match(/^\/api\/reports\/([^/]+)$/))) {
    const { sub } = Auth.requireAuth(req);
    const body    = await readBody(req);
    const report  = await Reports.review(m[1], body.decision, sub);
    return sendJSON(res, 200, { report });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ANALYTICS ROUTES
  // ══════════════════════════════════════════════════════════════════════════

  //  GET /api/analytics/me
  if (method === 'GET' && pathname === '/api/analytics/me') {
    const { sub } = Auth.requireAuth(req);
    const stats   = await Analytics.userStats(sub);
    return sendJSON(res, 200, stats);
  }

  //  GET /api/analytics/platform (admin)
  if (method === 'GET' && pathname === '/api/analytics/platform') {
    Auth.requireAuth(req);
    const stats = await Analytics.platformStats();
    return sendJSON(res, 200, stats);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SEARCH FACETS
  // ══════════════════════════════════════════════════════════════════════════

  //  GET /api/search/facets?category=&q=
  if (method === 'GET' && pathname === '/api/search/facets') {
    let products = db.getPublishedProducts();
    if (query.category) products = products.filter(p => p.category === query.category);
    if (query.q)        products = Search.filter(products, query.q);
    return sendJSON(res, 200, Search.facets(products));
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  404
  // ══════════════════════════════════════════════════════════════════════════

  sendJSON(res, 404, { error: 'Route not found', path: pathname, method });
}

// ── Global error handler ──────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    if (err instanceof ApiError) {
      return sendJSON(res, err.status, { error: err.message });
    }
    console.error('[KYRO ERROR]', err);
    sendJSON(res, 500, { error: 'Internal server error' });
  }
});

server.listen(CONFIG.PORT, () => {
  console.log(`
  ██╗  ██╗██╗   ██╗██████╗  ██████╗
  ██║ ██╔╝╚██╗ ██╔╝██╔══██╗██╔═══██╗
  █████╔╝  ╚████╔╝ ██████╔╝██║   ██║
  ██╔═██╗   ╚██╔╝  ██╔══██╗██║   ██║
  ██║  ██╗   ██║   ██║  ██║╚██████╔╝
  ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝

  Developer Marketplace — Backend Server
  ───────────────────────────────────────
  Running at:  http://localhost:${CONFIG.PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  JWT secret:  ${CONFIG.JWT_SECRET === process.env.JWT_SECRET ? '(from .env)' : '(auto-generated — set JWT_SECRET in .env for persistence)'}

  API Endpoints:
  ─────────────────────────────────────
  Auth
    POST   /api/auth/register
    POST   /api/auth/login
    GET    /api/auth/me
    PATCH  /api/auth/me
    POST   /api/auth/change-password
    GET    /api/auth/github          (start OAuth)
    GET    /api/auth/github/callback (OAuth return)

  Products
    GET    /api/products             (list + search + filter)
    POST   /api/products             (create)
    GET    /api/products/:id         (detail + view tracking)
    PATCH  /api/products/:id         (update)
    DELETE /api/products/:id         (soft delete)
    POST   /api/products/:id/rate    (1–5 star rating)
    POST   /api/products/:id/download (track download)
    GET    /api/products/search/autocomplete?q=

  Storefronts
    GET    /api/store/:username

  Messaging
    GET    /api/messages             (list threads)
    POST   /api/messages             (get/create thread)
    GET    /api/messages/:threadId   (chat history)
    POST   /api/messages/:threadId   (send message)
    DELETE /api/messages/:threadId/:messageId

  Reports
    POST   /api/reports              (file report)
    GET    /api/reports              (admin: list reports)
    PATCH  /api/reports/:id          (admin: review decision)

  Analytics
    GET    /api/analytics/me         (user stats)
    GET    /api/analytics/platform   (admin: platform stats)

  Search
    GET    /api/search/facets?q=&category=

  Pages
    GET    /            → index.html  (landing)
    GET    /app         → app.html    (main app)
    GET    /login       → login.html
    GET    /pricing     → pricing.html
  ─────────────────────────────────────
`);
});

module.exports = { Auth, Scoring, Marketplace, Products, Storefronts, Messaging, Reports, Search, Analytics, JWT, PasswordHasher, db };
