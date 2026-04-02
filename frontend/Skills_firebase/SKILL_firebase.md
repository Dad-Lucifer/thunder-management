---
name: Skills_firebase
description: |
  Analyzes, audits, and optimizes the Firebase backend architecture for the Thunder Gaming Cafe management system.
  Use this skill whenever working with Firestore reads/writes, Firebase Authentication, Cloud Functions, 
  security rules, query patterns, data modeling, cost reduction, or any backend performance concern.
  Always apply this skill when the user mentions: Firebase quota errors, slow queries, excessive reads/writes,
  Firestore indexes, security rules, real-time listeners, batched operations, authentication flows,
  session data fetching, analytics optimization, or any database restructuring request.
  This skill enforces cost-efficient, high-performance, and secure Firebase patterns tailored to this project.
---

# Skills_firebase — Firebase Backend Architecture Intelligence

This skill equips the agent with a deep, project-specific understanding of the Thunder Gaming Cafe Firebase backend. Its purpose is to analyze, reason about, and enforce optimized, scalable, and secure Firebase practices across every layer of the system.

> **Read `references/architecture.md`** for the complete Firestore schema, collection inventory, and query pattern map.  
> **Read `references/optimization_rules.md`** for the enforcement checklist, anti-patterns, and approved fix patterns.  
> **Read `references/security_rules.md`** for the security rule templates and enforcement guidelines.

---

## Project Context

This is a **Node.js + Express backend** (deployed on Vercel) that uses **Firebase Admin SDK** to interface with **Cloud Firestore**. There is no Realtime Database or Cloud Functions — all logic runs as REST API endpoints. The frontend is a React/Vite SPA that talks exclusively to these REST endpoints (no direct Firestore SDK calls from the client).

**Architecture summary:**
- Auth: Firebase Authentication (client-side) + Firebase Admin on backend to verify tokens
- Database: Cloud Firestore (Admin SDK, server-side only)
- Real-time: Socket.IO (via Express server) — NOT Firestore listeners
- Deployment: Vercel (serverless functions — stateless, no persistent in-memory cache)

---

## Core Directives

### 1. Minimize Reads and Writes

Every Firestore operation costs money and latency. Before adding any query:
- Ask: **"Can this data be derived from a query already being made in this request?"**
- Ask: **"Is this data stable enough to be embedded in a parent document?"**
- Ask: **"Could we batch this with other writes happening in the same flow?"**

The `getDashboardData` endpoint (analyticsController.js) is the gold standard: it consolidates what was once 5 separate queries into 3 parallel reads using `Promise.all`. Replicate this pattern everywhere.

### 2. Never Restructure Without Justification

The schema is live and deployed. Any structural change requires:
- Clear statement of the performance/cost/scalability problem it solves
- Evidence that the fix cannot be achieved by query optimization alone
- Assessment of migration complexity and data integrity risk

### 3. Enforce Least-Privilege Security

No endpoint or security rule should grant broader access than the minimum required. Always:
- Validate inputs server-side before any Firestore write
- Use transactions for any multi-document write that must be atomic
- Prefer `FieldValue.increment()` over read-then-write patterns

---

## Quick Pattern Reference

### ✅ Approved Patterns

| Scenario | Approved Approach |
|---|---|
| Multiple analytics queries in one request | `Promise.all([...])` — parallel reads |
| Score/coin increment | `admin.firestore.FieldValue.increment(n)` |
| Multi-step atomic update (e.g. finish battle + award coins) | `db.runTransaction(async t => { ... })` |
| Snack stock deduction with consistency | Transaction + `t.get()` + `t.update()` |
| Availability check (active sessions) | Single `where('status', '==', 'active').get()` — reuse in same request |
| Soft-search by name | Store `customerNameLower` + `nameLower` fields, query with `==` on lowercase |
| Write-heavy session updates | Single `ref.update({...})` with all changed fields in one call |
| New document creation | `db.collection(...).add({})` — auto-ID |
| Known-ID document | `db.collection(...).doc(phone).set({}, { merge: true })` |

### ❌ Anti-Patterns to Flag and Fix

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Multiple `db.collection().get()` calls in series for same request | Sequential reads — slow and wasteful | Parallelize with `Promise.all` |
| `getPricingConfig()` called inside a loop or per-document | N+1 reads | Fetch once outside the loop |
| Reading a document just to check if it exists before writing | Extra read | Use `set({ merge: true })` or transaction |
| `getAll()` or unbounded `.get()` on full collections | Full collection scans | Add `where()` and/or `.limit()` clauses |
| Writing the same field multiple times in one flow | Wasted writes | Collect all changes, emit a single `update()` |
| Using `onSnapshot` (real-time listeners) server-side | Admin SDK doesn't benefit from listeners | Use one-time `.get()` always |
| Redundant availability checks (active sessions queried twice) | Double read | Hoist query, share result |

---

## Collection Registry

See `references/architecture.md` for full schema. Summary:

| Collection | Key Fields | Primary Queries |
|---|---|---|
| `sessions` | status, createdAt, startTime | `where status == active`, `where createdAt >= ISO` |
| `bookings` | status, bookingTime | `where status == upcoming` |
| `battles` | status, createdAt | `where status == active/completed` |
| `battelwinner` | thunderCoins (doc ID = phone) | `orderBy thunderCoins desc limit 10`, `doc(phone).get()` |
| `users` | username, email, role (doc ID = uid) | `where username == X limit 1` |
| `snacks` | name, quantity, soldQuantity | `where name == X limit 1` |
| `settings` | (doc: `pricing`) | `doc('pricing').get()` — single doc |
| `deletion_logs` | deletedAt, source | `where deletedAt >= ISO orderBy deletedAt desc` |
| `management_subscriptions` | createdAt | `orderBy createdAt desc` |
| `management_salaries` | paymentDate | `orderBy paymentDate desc` |

---

## Optimization Checklist (Apply Before Any Change)

Before modifying any controller:

1. **Identify all Firestore reads in the function** — list every `.get()`, `.add()`, `.update()`, `.set()`, `.delete()`
2. **Check for parallelizable reads** — if multiple reads don't depend on each other, wrap in `Promise.all`
3. **Check for reusable snapshots** — if a query result is used more than once, store it in a variable
4. **Check for N+1 patterns** — never call Firestore inside a `.forEach()` or loop
5. **Check write fields** — are all necessary fields written in a single `update()` call?
6. **Check for missing `.limit()`** — any query without a `where` clause or document-level access needs a limit
7. **Check for transaction candidates** — any two writes that must succeed together should be a transaction

---

## Security Enforcement Principles

Since this backend uses Firebase Admin SDK (server-side), Firebase Security Rules apply to client-side access only. All Firestore interactions happen via Admin SDK which bypasses rules. Security is enforced at the **Express middleware and controller level**:

- All sensitive routes must validate the Firebase ID token via `auth.verifyIdToken(token)`
- Role-based access (`owner` vs `employee`) must be checked after token verification
- All inputs must be sanitized and validated before Firestore writes
- ThunderCoins deduction must use a `Math.min(currentCoins, requestedDeduction)` guard to prevent frontend manipulation
- Deletion operations must always write to `deletion_logs` first (audit trail)

For client-side Security Rules (if ever needed), read `references/security_rules.md`.

---

## Known Cost Hotspots in This Codebase

These are the highest-impact areas to audit first:

1. **`createSession` & `createBooking`** — both independently query active sessions for availability. If called back-to-back or refactored, the availability snapshot should be shared or cached within the request.

2. **`getPricingConfig()`** — defined identically in both `sessionController.js` and `ownerDashboardController.js`. This is a duplicated helper that reads `settings/pricing` on every call. Consider a module-level singleton or passing config as a parameter.

3. **`getRevenueByMachine`** — calls `getPricingConfig()` separately after already fetching sessions. Since pricing is used for calculation only (no per-session variability), fetching it once at the top of the function or sharing a cached version is ideal.

4. **`managementController.js`** — `getSubscriptions` and `getSalaries` do full collection reads with `orderBy` but no date-range filter. If these collections grow, add a date filter.

5. **`exportSessions`** — fetches up to 2000 sessions. This is intentionally broad for exports but should never be called in a hot path.

---

## Response Format When Auditing

When asked to audit a file or function, structure your response as:

```
## Audit: [FileName / FunctionName]

### Read Operations Found
- [list each .get(), .add(), .update(), .set(), .delete()]

### Issues Identified
- [Issue]: [Explanation] → [Proposed Fix]

### Optimization Opportunities
- [Opportunity]: [Impact estimate] → [Implementation]

### Security Observations
- [Any auth gaps, missing validation, unsafe writes]

### Recommended Changes
[Code diff or example of optimized version]

### Do NOT Change
[Anything that is already optimal or whose change risk outweighs benefit]
```
