# Optimization Rules & Anti-Pattern Enforcement
# Thunder Firebase Backend

## Table of Contents
1. [Optimization Enforcement Checklist](#optimization-enforcement-checklist)
2. [Anti-Pattern Catalog](#anti-pattern-catalog)
3. [Approved Fix Patterns](#approved-fix-patterns)
4. [Cost Hotspot Registry](#cost-hotspot-registry)
5. [Benchmarks & Thresholds](#benchmarks--thresholds)

---

## Optimization Enforcement Checklist

Apply this checklist to every function you review or write:

### Reads
- [ ] Are all reads parallelized that can be? Use `Promise.all([...])`
- [ ] Is any snapshot being fetched more than once in the same request? Hoist and reuse.
- [ ] Is `getPricingConfig()` called more than once per request? It should be called at most once.
- [ ] Are all queries bounded? Every unbounded `.get()` must have a `where()` or `.limit()`
- [ ] Is data being read just to be immediately deleted or overwritten? Consider `set()` directly.
- [ ] Is a query inside a `.forEach()` or loop? Flag as N+1 — restructure immediately.
- [ ] Should this be a one-time `.get()` or is a real-time listener genuinely needed? (It's always `.get()` on this backend)

### Writes
- [ ] Are multiple `.update()` calls to the same document in the same flow? Merge into one.
- [ ] Is a counter/coin being incremented via read-then-write? Replace with `FieldValue.increment(n)`
- [ ] Is a set of documents being created/updated independently that logically should be atomic? Use a transaction or batch.
- [ ] Is `snackService.deductStock()` called from both `createSession` and separately? Confirm de-duplication.

### Transactions
- [ ] Does this write involve two or more documents where partial failure would corrupt state? Use `db.runTransaction()`
- [ ] Is money/coins involved? Always use a transaction or `FieldValue.increment` to prevent race conditions.

### Structural
- [ ] Is pagination needed? Any query with `.limit(50+)` that a user could paginate through needs a cursor.
- [ ] Are ISO strings being compared as date filters? Ensure consistent format with `new Date().toISOString()`

---

## Anti-Pattern Catalog

### AP-01: Serial Reads That Could Be Parallel

**Symptom:**
```js
const snap1 = await db.collection('sessions').where('status', '==', 'active').get();
const snap2 = await db.collection('bookings').where('status', '==', 'upcoming').get();
```

**Problem:** Each `await` blocks until the previous resolves. If each takes 100ms, total is 200ms.

**Fix:**
```js
const [snap1, snap2] = await Promise.all([
  db.collection('sessions').where('status', '==', 'active').get(),
  db.collection('bookings').where('status', '==', 'upcoming').get()
]);
```

**Currently present in:** `createBooking()`, `getDeviceAvailabilityForTime()`

---

### AP-02: Duplicate Availability Query Within Same Request

**Symptom:** `getDeviceAvailability` AND `createSession` both independently query active sessions.

**Problem:** If a client calls `createSession`, active sessions are queried twice — once for the availability check.

**Fix:** In `createSession`, the active sessions query already runs to validate availability. Store results and reuse. Do not call `getDeviceAvailability` as a separate sub-function that re-queries.

---

### AP-03: `getPricingConfig()` Called Multiple Times Per Request

**Symptom:**
```js
// In ownerDashboardController.js - getRevenueByMachine
const pricingConfig = await getPricingConfig(); // fetches settings/pricing
```

This function is defined identically in both `sessionController.js` and `ownerDashboardController.js`. Each reads `settings/pricing` separately.

**Problem:** Duplicated code + duplicated reads if both are called in the same logical flow.

**Fix Options:**
1. Extract to a shared `utils/pricingConfig.js` module
2. Pass `pricingConfig` as a parameter to functions that need it
3. Module-level lazy cache with TTL (careful on serverless — stateless between requests):
```js
// utils/pricingConfig.js
let cached = null;
let cachedAt = 0;
const TTL = 60 * 1000; // 1 minute

const getPricingConfig = async () => {
  if (cached && (Date.now() - cachedAt) < TTL) return cached;
  const doc = await db.collection('settings').doc('pricing').get();
  cached = doc.exists ? mergeWithDefaults(doc.data()) : getDefaultPricingConfig();
  cachedAt = Date.now();
  return cached;
};
```

> ⚠️ Vercel serverless functions are stateless between REQUESTS but warm instances may share module-level state within a short window. This cache is a best-effort optimization, not a guarantee.

---

### AP-04: Read-Then-Write for Counters (ThunderCoins)

**Symptom (in `createSession`):**
```js
const playerSnap = await playerRef.get();         // READ
const currentCoins = playerSnap.data().thunderCoins || 0;
const safeDeduction = Math.min(currentCoins, thunderCoinsUsed);
await playerRef.update({
  thunderCoins: currentCoins - safeDeduction      // WRITE
});
```

**Problem:** Race condition if two sessions deduct coins simultaneously. Also uses 2 ops instead of 1.

**Better pattern** (if you only need to deduct and don't need the coin validation server-side):
```js
await playerRef.update({
  thunderCoins: admin.firestore.FieldValue.increment(-thunderCoinsUsed)
});
```

**If you need validation** (prevent over-deduction), use a transaction:
```js
await db.runTransaction(async t => {
  const snap = await t.get(playerRef);
  const current = snap.exists ? (snap.data().thunderCoins || 0) : 0;
  const safe = Math.min(current, thunderCoinsUsed);
  if (safe > 0) t.update(playerRef, { thunderCoins: FieldValue.increment(-safe) });
});
```

---

### AP-05: N+1 Queries Inside Loops

**Symptom:**
```js
snapshot.forEach(async doc => {
  const extra = await db.collection('something').doc(doc.id).get(); // INSIDE LOOP
});
```

**Problem:** Each iteration triggers a new Firestore read. 100 docs = 100 reads.

**Fix:** Either embed the needed data in the parent document (denormalization) or batch-load with `db.getAll([...refs])` or a single `whereIn` query.

**Not currently present in this codebase** but guard against it in future development.

---

### AP-06: Unbounded Collection Reads

**Symptom:**
```js
db.collection('management_subscriptions').orderBy('createdAt', 'desc').get()
db.collection('management_salaries').orderBy('paymentDate', 'desc').get()
```

**Problem:** As these collections grow, reads become increasingly expensive.

**Fix:** Add `.limit(100)` or date-range filters:
```js
db.collection('management_subscriptions')
  .where('createdAt', '>=', sixMonthsAgo.toISOString())
  .orderBy('createdAt', 'desc')
  .limit(100)
  .get()
```

---

### AP-07: Using `name` as Lookup Key for Auto-ID Collection

**Symptom (snacks):**
```js
const snapshot = await db.collection('snacks').where('name', '==', name).limit(1).get();
```

**Problem:** If two snack documents have the same name (data corruption), `limit(1)` silently picks one arbitrarily. Also, this pattern always does a collection query instead of a direct document read.

**Better architecture:** Use snack name (lowercase-normalized) as the document ID:
```js
const ref = db.collection('snacks').doc(normalizedName);
const doc = await ref.get();
```
This replaces a collection query with a direct document read — much faster and guaranteed unique.

> **Schema change required** — only proceed if justified by growth in snack inventory or frequent lookup patterns causing performance issues.

---

### AP-08: Storing Timestamps as ISO Strings Only

**Symptom:** `startTime`, `createdAt`, `bookingTime` stored as ISO strings.

**Problem:** Firestore `Timestamp` type enables server-side range queries with native date ordering. ISO string comparison works IF the format is consistent (`YYYY-MM-DDTHH:mm:ss.sssZ`) — but is fragile.

**Current state:** The codebase uses ISO strings everywhere and it works. Do NOT change this unless:
- You're querying by date ranges using Firestore's native `Timestamp` comparison
- You're experiencing precision issues with date comparisons

**Existing workaround already in place:**
```js
const toDate = (value) => {
  if (value?.toDate) return value.toDate(); // Firestore Timestamp
  return new Date(value); // ISO string fallback
};
```

---

## Approved Fix Patterns

### Pattern 1: Parallel Read Consolidation

```js
// BEFORE (serial)
const activeSessions = await db.collection('sessions').where('status', '==', 'active').get();
const upcomingBookings = await db.collection('bookings').where('status', '==', 'upcoming').get();

// AFTER (parallel)
const [activeSessions, upcomingBookings] = await Promise.all([
  db.collection('sessions').where('status', '==', 'active').get(),
  db.collection('bookings').where('status', '==', 'upcoming').get()
]);
```

---

### Pattern 2: Single Batched Write

```js
// BEFORE (multiple updates)
await ref.update({ duration: newDuration });
await ref.update({ price: newPrice });
await ref.update({ updatedAt: now });

// AFTER (single update)
await ref.update({
  duration: newDuration,
  price: newPrice,
  updatedAt: now
});
```

---

### Pattern 3: Atomic Increment

```js
// BEFORE (read-then-write)
const snap = await ref.get();
const current = snap.data().thunderCoins;
await ref.update({ thunderCoins: current + 15 });

// AFTER (atomic)
await ref.update({
  thunderCoins: admin.firestore.FieldValue.increment(15)
});
```

---

### Pattern 4: Transaction for Multi-Document Atomicity

```js
// USE when two documents must be updated together (battle finish + coin award)
await db.runTransaction(async t => {
  const doc = await t.get(ref);
  // ... compute changes ...
  t.update(ref1, { status: 'completed' });
  t.set(ref2, { thunderCoins: FieldValue.increment(15) }, { merge: true });
});
```

---

### Pattern 5: Hoisting Reusable Snapshots

```js
// BEFORE (availability queried multiple times)
function getDeviceAvailability() {
  const snap = db.collection('sessions').where('status', '==', 'active').get();
  // ... compute occupied ...
}

function createSession() {
  const snap = db.collection('sessions').where('status', '==', 'active').get(); // DUPLICATE
  // ... validate availability ...
}

// AFTER (shared logic, query once)
async function getOccupiedDevices() {
  const snap = await db.collection('sessions').where('status', '==', 'active').get();
  const occupied = { ps: [], pc: [], vr: [], wheel: [], metabat: [] };
  snap.forEach(doc => {
    // ... populate occupied ...
  });
  return occupied;
}

// Both functions call getOccupiedDevices() — but this still does 1 read each call.
// For single-request sharing: pass the snapshot as a parameter if both ops happen in same request.
```

---

## Cost Hotspot Registry

Ranked by estimated daily Firestore operation impact:

| Rank | Location | Operation | Estimated Daily Reads | Fix Priority |
|---|---|---|---|---|
| 1 | `sessionController.createSession` | Active sessions + pricing | High (every session creation) | Medium (already fast) |
| 2 | `analyticsController` (legacy endpoints) | 5 separate reads per dashboard load | Very high if called | LOW — `getDashboardData` replaces these |
| 3 | `ownerDashboardController.getRevenueByMachine` | Sessions + pricing (serial) | Medium | Medium |
| 4 | `sessionController.createBooking` | Active sessions + bookings (serial) | Medium | High |
| 5 | `managementController.getSubscriptions/Salaries` | Full collection reads | Low currently | Low — add limit when > 500 docs |
| 6 | `sessionController.exportSessions` | Up to 2000 docs | Very high if triggered | Keep as-is (admin-only feature) |

---

## Benchmarks & Thresholds

Use these thresholds when evaluating impact of changes:

| Metric | Acceptable | Warning | Critical |
|---|---|---|---|
| Reads per API request | ≤ 3 | 4–6 | > 6 |
| Writes per API request | ≤ 2 | 3–4 | > 4 |
| Documents in a single query result | ≤ 100 | 100–500 | > 500 |
| Response latency (p50) | < 200ms | 200–500ms | > 500ms |
| Active sessions collection size | < 50 (expected) | 50–100 | > 100 |
| Sessions collection total size | < 50,000 | 50K–200K | > 200K (add archival) |

---

## When NOT to Optimize

Do not optimize if:
1. The code is already performing ≤ 2 reads and 1 write per request
2. The collection involved has < 100 documents and is rarely queried
3. The "optimization" would require a schema migration (restructure) and the current system is not hitting quota limits or performance thresholds
4. The existing pattern is already idiomatic and readable, and the performance gain is < 10%
5. The change introduces complexity that makes the code harder to maintain than the performance gain justifies
