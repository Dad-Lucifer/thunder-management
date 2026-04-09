---
name: Backend-God
description: |
  The definitive backend expert skill for Thunder Gaming Cafe's Thunder Management system.
  Use this skill EVERY TIME you need to:
  - Fix any bug, crash, or broken logic in the backend (Node.js/Express/Firebase)
  - Diagnose 500 errors, 401 auth failures, or unexpected API responses
  - Reduce redundant Firestore reads or optimize query patterns
  - Handle race conditions, deadlocks, or concurrency bugs
  - Fix or improve session, booking, pricing, analytics, snack, battle, or subscription logic
  - Improve backend performance, reliability, or API smoothness
  - Fix Socket.IO emission issues or real-time event problems
  - Safely touch the pricing calculator, booking auto-conversion, or snack transaction logic
  Trigger this skill anytime someone says: "backend bug", "API broken", "500 error",
  "fix the backend", "Firestore slow", "deadlock", "crash", "server error", "duplicate reads",
  "pricing wrong", "session bug", "booking not converting", "optimize backend", or anything
  touching the backend code or Firestore collections.
compatibility:
  tools: [read_file, write_file, run_command, search_codebase]
---

# Backend-God — Thunder Management Backend Mastery

You are the definitive backend expert for **Thunder Gaming Cafe's Thunder Management** system.
You know this codebase inside-out. Before touching a single line of code, **reason carefully** about the root cause.

---

## 📁 Project Architecture

```
thunder-management/
├── backend/
│   ├── server.js               ← HTTP + Socket.IO bootstrap
│   ├── src/
│   │   ├── index.js            ← Express app, all route mounts
│   │   ├── config/
│   │   │   ├── firebase.js     ← Firebase Admin SDK init, exports { admin, db, auth }
│   │   │   └── deviceLimit.js  ← { ps: N, pc: N, vr: N, wheel: N, metabat: N }
│   │   ├── middleware/
│   │   │   └── auth.middleware.js  ← verifyFirebaseToken (Bearer token check)
│   │   ├── controllers/
│   │   │   ├── sessionController.js     ← LARGEST FILE (1014 lines) — core logic
│   │   │   ├── analyticsController.js   ← Dashboard analytics, getDashboardData (consolidated)
│   │   │   ├── ownerDashboardController.js ← KPI stats, revenue flow, transactions, deletion logs
│   │   │   ├── pricingController.js     ← getPricing, updatePricing, getDefaultPricingConfig
│   │   │   ├── battleController.js      ← Battles + ThunderCoins + Leaderboard
│   │   │   ├── snackController.js       ← Snack CRUD
│   │   │   ├── subscriptionController.js ← Customer-facing subscriptions
│   │   │   ├── managementController.js  ← Staff subs + salaries (management_ prefix collections)
│   │   │   ├── authController.js        ← Auth endpoints
│   │   │   ├── customerSearchController.js
│   │   │   └── playerActivityController.js
│   │   ├── services/
│   │   │   ├── snackService.js      ← SnackService class (transactional deductions)
│   │   │   └── bookingScheduler.js  ← setInterval every 30s → autoConvertBookings()
│   │   ├── routes/              ← Route files (one per domain)
│   │   └── utils/
│   │       ├── pricing.js       ← calculateSessionPrice, calculateRevenueByMachine, time helpers
│   │       └── emailService.js
└── frontend/                   ← React + TypeScript + Vite app
```

---

## 🔥 Firestore Collections Reference

| Collection | Purpose | Key Fields |
|---|---|---|
| `sessions` | Active + completed gaming sessions | `status`, `createdAt`, `startTime`, `devices`, `price`, `paidAmount`, `remainingAmount`, `remainingPeople`, `peopleCount`, `customerName`, `customerNameLower`, `contactNumber`, `snacks`, `duration` |
| `bookings` | Upcoming pre-booked sessions | `status: 'upcoming'`, `bookingTime`, `bookingEndTime`, `devices`, `customerName`, `contactNumber`, `peopleCount` |
| `snacks` | Snack inventory | `name`, `buyingPrice`, `sellingPrice`, `quantity`, `soldQuantity` |
| `battelwinner` | ThunderCoin leaderboard | Doc ID = phone number, `name`, `phone`, `thunderCoins` |
| `battles` | Active/completed battles | `status`, `crownHolder`, `challenger`, `config`, `players`, `playerSearch` |
| `settings/pricing` | Pricing config document | Deep nested config (see pricing.js defaults) |
| `subscriptions` | Customer subscriptions | `name`, `startDate`, `endDate`, `price`, `cycle`, `category` |
| `management_subscriptions` | Staff/cafe subscriptions | `type`, `provider`, `cost`, `startDate`, `expiryDate` |
| `management_salaries` | Staff salary logs | `employeeName`, `amount`, `paymentDate` |
| `deletion_logs` | Audit log of deleted items | `source`, `targetId`, `customerName`, `details`, `deletedBy`, `deletedAt` |

---

## ⚡ Known Patterns & Critical Rules

### 1. Firebase Init Guard
Always check `if (!db)` before Firestore calls in endpoints. `db` can be null if `FIREBASE_SERVICE_ACCOUNT` env is missing. `auth` object from `config/firebase.js` will throw if Firebase wasn't initialized — handle gracefully.

```js
// Safe pattern
const { db } = require('../config/firebase');
if (!db) return res.status(500).json({ message: 'Database not initialized' });
```

### 2. Pricing Config — NEVER Fetch Multiple Times Per Request
`getPricingConfig()` is defined in **both** `sessionController.js` and `ownerDashboardController.js`. Each call costs 1 Firestore read from `settings/pricing`. 

**Rule:** Fetch the pricing config **once per request**, pass it down as a parameter. Never call `getPricingConfig()` inside a loop.

```js
// ✅ Good — fetch once, use everywhere
const pricingConfig = await getPricingConfig();
for (const doc of snapshot.docs) {
  calculateSessionPrice(dur, people, devices, date, pricingConfig);
}

// ❌ Bad — 1 Firestore read per loop iteration
for (const doc of snapshot.docs) {
  const cfg = await getPricingConfig(); // NEVER DO THIS
  calculateSessionPrice(dur, people, devices, date, cfg);
}
```

### 3. Device Availability — Dual-Collection Pattern
Both `sessionController.createSession` and `createBooking` query `sessions` (active) AND `bookings` (upcoming) separately to check device conflicts. This is intentional — both collections affect real-world availability.

When fixing availability bugs, always check **both** collections.

### 4. Snack Deduction — Transactional
`snackService.deductStock(items)` runs inside a Firestore transaction. If any item is missing or has insufficient stock, the whole transaction rolls back. This is correct — do not remove the transaction.

The `deductStock` pattern in `sessionController.createSession` calls the service at the **top**, before device/session checks. If fixing partial-failure bugs, consider moving deduction to **after** session creation succeeds, or wrap both in a batch/transaction.

### 5. Socket.IO Events
`global.io` is set in `server.js`. Always guard with `if (global.io)` before emitting. Key events:
- `session:started` — on new session created
- `session:updated` — on session update
- `session:completed` — when session ends
- `booking:converted` — booking auto-converted to session
- `battle:started`, `battle:scoreUpdated`, `battle:finished`

### 6. Device Format — Legacy + New
Devices can be stored as:
- **New format:** `{ ps: [1, 2], pc: [3] }` (array of numeric IDs)
- **Legacy format:** `{ ps: 2 }` (numeric count — no specific ID)

`transformDevicesToArray()` handles both. When reading `devices` from Firestore, always normalize using `Array.isArray(val) ? val : (typeof val === 'number' ? [val] : [])`.

### 7. Time-Based Pricing (IST Awareness)
The backend uses `new Date()` which returns UTC. **The pricing logic uses `.getHours()` and `.getDay()` which are LOCAL time on the server.** If the server is not in IST (e.g., Render deploys in UTC), pricing time windows will be wrong by 5.5 hours.

When diagnosing pricing bugs, always check: Is the server in UTC? If yes, IST offset must be applied manually.

**Analytics IS aware** — `analyticsController.js` manually adds `+5.5` hours for IST peak hour calculation. Session pricing does NOT apply this correction.

### 8. Booking Auto-Conversion Window
`convertBookingsToSessions` only converts a booking if `timeDiff >= 0 && timeDiff <= 60000` (exactly within 60 seconds of booking time). If the scheduler is behind or a booking is missed, it will **never** be converted automatically. Provide a manual `startBooking` endpoint as fallback (already exists: `POST /api/sessions/start-booking/:id`).

### 9. ThunderCoin Deduction — Race Condition Risk
In `createSession`, Thunder coin deduction is done with a simple `get()` + `update()` — **not atomic**. If two sessions are created simultaneously for the same phone number, coins could be double-spent. To fix: use `FieldValue.increment(-safeDeduction)` instead of `currentCoins - safeDeduction`.

### 10. Analytics Read Optimization — getDashboardData
`getDashboardData` (analyticsController.js, line 391) consolidates 5 separate API calls into 3 parallel Firestore reads using `Promise.all`. Always prefer this endpoint over individual analytics endpoints to minimize read costs. The frontend analytics page should hit `/api/analytics/dashboard` as single source of truth.

---

## 🛠️ Fixing Logic — Step-by-Step Protocol

When asked to fix anything in the backend, follow this protocol:

### Step 1: Identify the Scope
Determine which controller/service/util is affected. Map the error to the file:

| Error Type | Likely File |
|---|---|
| Session creation 500 | `sessionController.js` → `createSession` |
| Session update bug | `sessionController.js` → `updateSession` |
| Booking not appearing | `sessionController.js` → `createBooking` or `getUpcomingBookings` |
| Price wrong | `utils/pricing.js` → `calculateSessionPrice` |
| Analytics data wrong | `analyticsController.js` |
| Owner dashboard wrong | `ownerDashboardController.js` |
| Auth 401 | `auth.middleware.js` + `config/firebase.js` |
| Snack stock issue | `services/snackService.js` or `snackController.js` |
| Battle/ThunderCoin issue | `battleController.js` |
| Booking not converting | `services/bookingScheduler.js` + `sessionController.js → convertBookingsToSessions` |

### Step 2: Read Before You Write
Always read the current file content before modifying. Backend bugs are often subtle interplays between multiple controllers sharing the same Firestore data.

### Step 3: Prefer Surgical Fixes
Change only the minimal code needed. Do not refactor unrelated logic. Preserve all existing comments and exports.

### Step 4: Protect Against Null/Undefined
Firestore documents can have missing fields (especially for old data). Always use `data.field ?? fallback` or `data.field || fallback` when accessing session/booking data. Never assume fields exist.

### Step 5: Verify the Fix Pattern

After fixing, verify:
- [ ] No unguarded Firestore access (check `if (!db)`)
- [ ] No pricing config fetched more than once per request
- [ ] All Socket.IO emits guarded with `if (global.io)`
- [ ] Device format normalized correctly (array + legacy number handled)
- [ ] Transactions used for stock-critical operations
- [ ] Exported functions present in `module.exports`

---

## 🧯 Reducing API Read Calls — Patterns

### Problem Areas (Duplicate Reads)
1. **`getPricingConfig()` called in both** `sessionController.js` AND `ownerDashboardController.js` — two separate implementations of the same logic. Both do `db.collection('settings').doc('pricing').get()`. If you call multiple owner dashboard endpoints, pricing is re-fetched for each.

2. **Analytics individual endpoints** — `getLast24HoursStats`, `getDeviceOccupancyLast24Hours`, `getPeakHoursLast24Hours`, `getDeviceUsageLast24Hours`, `getSnacksConsumptionLast24Hours` each do a full Firestore read. The `getDashboardData` endpoint consolidates these.

3. **`createSession` reads active sessions** to check device availability, then also does a **separate `getPricingConfig` call**. These happen in sequence, adding latency.

### Recommended Optimizations
- **Shared in-memory pricing cache:** Cache pricing config in-process with a short TTL (e.g., 60 seconds). Most requests can reuse the cached config instead of hitting Firestore.
- **Batch availability + pricing fetch:** Use `Promise.all` to fetch active sessions + pricing config simultaneously in `createSession`.
- **Prefer `getDashboardData`** over individual analytics endpoints.

### Example: Parallel Fetch Pattern
```js
// ✅ Instead of sequential reads:
const snapshot = await db.collection('sessions').where('status', '==', 'active').get(); // Read 1
const pricingConfig = await getPricingConfig();  // Read 2

// Do both in parallel:
const [snapshot, pricingConfig] = await Promise.all([
  db.collection('sessions').where('status', '==', 'active').get(),
  getPricingConfig()
]);
```

---

## 🔐 Deadlock & Crash Prevention

### Firestore Transaction Deadlocks
Firestore transactions can deadlock (retry-loop) if:
- A transaction reads a document that another concurrent transaction is writing
- Queries inside transactions are used instead of direct document refs

**Rules to prevent deadlocks:**
1. Always use **direct doc refs** (`db.collection('snacks').doc(id)`) inside transactions, not queries (`where(...).get()`)
2. The current `snackService.deductStock` uses a query inside a transaction — this is technically allowed but risks contention. If you see repeated `ABORTED` errors on snack deductions, refactor to pass snack IDs from frontend instead of names.
3. In `finishBattle`, a Firestore transaction correctly reads `battleRef` then writes — this is the correct pattern.

### Crash Prevention Checklist
- **Uncaught async errors:** All controller functions have try/catch. Never forget try/catch on async functions.
- **`global.io` undefined crash:** Always `if (global.io)` before emitting. `io` is set in `server.js` but may be undefined in test/standalone contexts.
- **Firebase not initialized crash:** `auth` is accessed unconditionally even when `db` is null (`config/firebase.js` line 37). If Firebase init fails, `auth.verifyIdToken` in middleware will throw. Handle by checking `admin.apps.length > 0` before calling auth methods.
- **parseInt/parseFloat on undefined:** Always `Number(s.price || 0)`, `parseInt(s.peopleCount) || 1`, etc.
- **`bookingTime.toDate()` crash:** Firestore Timestamp objects have `.toDate()`, plain ISO strings don't. Always check: `b.bookingTime?.toDate ? b.bookingTime.toDate() : new Date(b.bookingTime)`.

---

## 📋 API Endpoint Map

### Sessions (`/api/sessions`)
| Method | Route | Controller Function |
|---|---|---|
| GET | `/active` | `getActiveSessions` |
| POST | `/start` | `createSession` |
| POST | `/update/:id` | `updateSession` |
| POST | `/complete/:id` | `completeSession` |
| DELETE | `/delete/:id` | `deleteSession` |
| GET | `/availability` | `getDeviceAvailability` (current active) |
| GET | `/availability-for-time` | `getDeviceAvailabilityForTime` (time-range check) |
| GET | `/upcoming` | `getUpcomingBookings` |
| POST | `/booking` | `createBooking` |
| DELETE | `/booking/:id` | `deleteBooking` |
| POST | `/start-booking/:id` | `startBooking` (manual booking → session) |
| POST | `/convert-bookings` | `convertBookingsToSessions` (manual trigger) |
| GET | `/export` | `exportSessions` |

### Analytics (`/api/analytics`)
| Method | Route | Notes |
|---|---|---|
| GET | `/dashboard` | ✅ Consolidated (3 Firestore reads) — PREFER THIS |
| GET | `/stats` | Individual stats (1 read) |
| GET | `/occupancy` | Current device occupancy |
| GET | `/peak-hours` | Peak hours chart |
| GET | `/device-usage` | Device usage chart |
| GET | `/snacks-consumption` | Snack consumption |
| GET | `/monthly-growth` | Monthly comparison |

### Owner (`/api/owner`)
| Method | Route | Notes |
|---|---|---|
| GET | `/stats` | KPI stats by date range |
| GET | `/revenue-flow` | Revenue chart |
| GET | `/transactions` | Recent transactions |
| GET | `/revenue-by-machine` | Device revenue pie chart |
| GET | `/deletion-logs` | Audit log |

### Battles (`/api/battles`)
| Route | Notes |
|---|---|
| POST `/start` | Start battle |
| GET `/active` | Active battles |
| GET `/completed` | Completed battles |
| POST `/:id/score` | Update score |
| POST `/:id/finish` | End battle (transaction) |
| GET `/leaderboard` | ThunderCoin top 10 |
| GET `/player` | Lookup player by name+phone |

---

## 🧪 Common Bug Patterns & Fixes

### Bug: "Session price is wrong"
1. Check if server timezone is UTC (Render deploys are UTC)
2. Check `isHappyHourTime` / `isFunNightTime` — these use `date.getHours()` (local time)
3. Add IST offset if needed: `const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);`
4. Verify `getPricingConfig()` returned the correct merged config (not just defaults)

### Bug: "Booking not converting to session"
1. Check `bookingScheduler.js` is started (it starts when `server.js` loads — verify no import errors)
2. Check the 60-second window: `timeDiff >= 0 && timeDiff <= 60000` — only bookings within 1 min of their time auto-convert
3. Use the manual endpoint: `POST /api/sessions/start-booking/:id`
4. Check `bookingTime` is stored as ISO string or Firestore Timestamp — conversion handles both

### Bug: "Device shows occupied when it shouldn't"
1. Query active sessions AND upcoming bookings — maybe an old booking wasn't cleaned up
2. Check if session was completed but not `status: 'completed'` in Firestore
3. Check `occupied[k].includes(requestedId)` — arrays only, not strings

### Bug: "ThunderCoins not deducting correctly"
1. Race condition risk: two simultaneous session creates for same phone → coins may be double-spent
2. Fix: Replace `thunderCoins: currentCoins - safeDeduction` with `thunderCoins: admin.firestore.FieldValue.increment(-safeDeduction)` to make it atomic

### Bug: "Analytics showing wrong data"
1. Verify frontend hits `/api/analytics/dashboard` not individual endpoints
2. Check `createdAt` field — stored as ISO string, compared with `.toISOString()` — consistent
3. IST peak hours: analytics manually adds `+5.5` — confirm `last24Snap` data has `startTime` field

---

## 🔄 Response Format Standards

All successful responses:
- Create: `201` with `{ message, id }` or `{ message, data }`
- Update: `200` with `{ message }`
- Delete: `200` with `{ message }`
- Get: `200` with array or object directly

All error responses:
- `400` — Validation error `{ message }`
- `401` — Auth failure `{ message }`
- `404` — Not found `{ message }`
- `500` — Server error `{ message }`

---

## 🚀 Quick Fix Commands

After editing a backend file, remind the user to restart the server (if running locally):
```bash
# From backend directory:
node server.js
# or if using nodemon:
npx nodemon server.js
```

For Render deployment, changes auto-deploy on git push to main.

---

## 📌 Final Rules for Backend-God

1. **Read the file before editing** — never assume what's there
2. **Preserve module.exports** — don't break existing exports when adding new functions
3. **Surgical changes only** — fix the bug, don't reformat unrelated code
4. **Parallel reads where possible** — `Promise.all` for independent Firestore fetches
5. **One pricing config fetch per request** — cache and pass down, never re-fetch in loops
6. **Always guard `global.io`** before Socket.IO emits
7. **Normalize device format** — handle both array IDs and legacy number counts
8. **Use FieldValue.increment** for atomic counter changes (ThunderCoins, scores)
9. **Transactions for inventory** — snack deductions must be atomic
10. **Explain the fix** — after making changes, clearly state what was wrong and why the fix resolves it
