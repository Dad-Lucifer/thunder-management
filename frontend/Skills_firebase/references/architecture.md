# Firebase Architecture Reference
# Thunder Gaming Cafe — Firestore Schema & Query Map

## Table of Contents
1. [System Overview](#system-overview)
2. [Firebase Configuration](#firebase-configuration)
3. [Collection Schemas](#collection-schemas)
4. [Query Patterns per Controller](#query-patterns-per-controller)
5. [Index Requirements](#index-requirements)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Socket.IO Events](#socketio-events)

---

## System Overview

```
Frontend (React/Vite)
    ↓  REST API calls
Express.js Backend (Node.js)
    ↓  Firebase Admin SDK
Cloud Firestore
```

- **No direct Firestore client SDK** from the browser
- **No Cloud Functions** — all logic in Express controllers
- **No Realtime Database** — Firestore only
- **Real-time** updates via Socket.IO (server → client), not Firestore listeners
- **Auth**: Firebase Authentication (client-side login), Admin SDK token verification (server-side)

---

## Firebase Configuration

**File:** `backend/src/config/firebase.js`

```js
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
db = admin.firestore();
auth = admin.auth();
```

Exports: `{ admin, db, auth }`

**Key behaviors:**
- Admin SDK bypasses all Firestore Security Rules
- All `db` operations are server-side only
- `auth.verifyIdToken(token)` is used for request authentication middleware

---

## Collection Schemas

### `sessions`
The most read/written collection in the system.

```
{
  customerName: string,
  customerNameLower: string,        // lowercase for soft search
  contactNumber: string,
  duration: number,                 // hours (float)
  peopleCount: number,
  gameName: string,
  snacks: [ { name: string, quantity: number } ],  // updated on each session.update
  devices: {                        // device allocation map
    ps: [1, 2],                     // array of device IDs
    pc: [3],
    vr: [],
    wheel: [],
    metabat: []
  },
  price: number,                    // total (base + snacks)
  paidAmount: number,               // cumulative paid
  remainingAmount: number,          // price - paidAmount
  remainingPeople: number,          // people who haven't paid yet
  cash: number,                     // cumulative cash received
  online: number,                   // cumulative online received
  status: 'active' | 'completed',
  startTime: ISO string,
  createdAt: ISO string,
  completedAt: ISO string | null,
  updatedAt: ISO string | null,
  members: [ newMember objects ],   // added mid-session people
  convertedFromBooking: boolean     // true if was a booking
}
```

**Common queries:**
```js
// Active sessions (used in 4+ controllers)
db.collection('sessions').where('status', '==', 'active').get()

// Last 24h (analytics)
db.collection('sessions').where('createdAt', '>=', last24.toISOString()).get()

// Date-range (owner dashboard, analytics)
db.collection('sessions').where('createdAt', '>=', startDate.toISOString()).get()

// Monthly (growth chart)
db.collection('sessions').where('createdAt', '>=', startOfLastMonth.toISOString()).get()

// Export (up to 2000)
db.collection('sessions').orderBy('createdAt', 'desc').limit(2000).get()

// Recent transactions
db.collection('sessions')
  .where('createdAt', '>=', startDate.toISOString())
  .orderBy('createdAt', 'desc')
  .limit(50).get()
```

---

### `bookings`
Upcoming session reservations.

```
{
  customerName: string,
  customerNameLower: string,
  contactNumber: string,
  bookingTime: ISO string | Firestore Timestamp,
  bookingEndTime: ISO string | Firestore Timestamp | null,
  peopleCount: number,
  devices: { ps: [1], pc: [], ... },
  status: 'upcoming' | 'cancelled' | 'converted',
  createdAt: ISO string
}
```

**Common queries:**
```js
// All upcoming (for availability + display)
db.collection('bookings').where('status', '==', 'upcoming').get()

// Upcoming ordered by time
db.collection('bookings')
  .where('status', '==', 'upcoming')
  .orderBy('bookingTime', 'asc').get()
```

> ⚠️ **Note:** `bookingTime` may be stored as a Firestore Timestamp OR an ISO string depending on when it was created. Always handle both: `value.toDate ? value.toDate() : new Date(value)`

---

### `battles`
PvP battle sessions between two players.

```
{
  crownHolder: {
    name: string,
    phone: string,
    teamName: string,
    score: number
  },
  challenger: {
    name: string,
    phone: string,
    teamName: string,
    score: number
  },
  config: {
    gameType: string,
    matchType: string,
    entryFee: number
  },
  players: [ { name, nameLower, phone } ],     // for search
  playerSearch: [ string, string ],             // lowercased names for array-contains
  status: 'active' | 'completed',
  winner: string | 'tie' | null,
  startTime: ISO string,
  endTime: ISO string | null,
  createdAt: ISO string
}
```

**Common queries:**
```js
db.collection('battles').where('status', '==', 'active').get()
db.collection('battles').where('status', '==', 'completed').limit(20).get()
```

---

### `battelwinner` *(sic — typo in production, do not rename)*
ThunderCoins leaderboard. Document ID = player phone number.

```
{
  name: string,
  phone: string,
  thunderCoins: number,             // incremented via FieldValue.increment
  updatedAt: ISO string
}
```

**Common queries:**
```js
// Leaderboard
db.collection('battelwinner').orderBy('thunderCoins', 'desc').limit(10).get()

// Lookup by phone (doc ID)
db.collection('battelwinner').doc(phone).get()

// Coin deduction (in createSession)
playerRef.update({ thunderCoins: currentCoins - safeDeduction })
// Note: This is a read-then-write. Should use FieldValue.increment(-n) instead.
```

---

### `users`
Auth profiles. Document ID = Firebase UID.

```
{
  name: string,
  email: string,
  username: string,
  role: 'owner' | 'employee',
  createdAt: ISO string
}
```

**Common queries:**
```js
// Username uniqueness check
db.collection('users').where('username', '==', username).limit(1).get()

// Resolve username to email
db.collection('users').where('username', '==', username).limit(1).get()
```

---

### `snacks`
Inventory management. No stable document ID (uses auto-id).

```
{
  name: string,                     // used for lookup; not unique enforced by Firestore
  buyingPrice: number,
  sellingPrice: number,
  quantity: number,                 // current stock
  soldQuantity: number,             // cumulative sold
  createdAt: ISO string,
  updatedAt: ISO string
}
```

**Common queries:**
```js
// Full inventory read
db.collection('snacks').get()

// Find by name
db.collection('snacks').where('name', '==', name).limit(1).get()

// Stock deduction (transaction)
db.runTransaction(async t => {
  const snap = await t.get(query);
  t.update(doc.ref, { quantity: newQty, soldQuantity: newSold });
});
```

> ⚠️ **Known issue:** `snacks` uses `name` as a lookup key but documents use auto-IDs. If duplicates exist by name, `limit(1)` may silently pick the wrong one. Consider making `name` the document ID.

---

### `settings`
App configuration. Single important document: `pricing`.

```
settings/pricing:
{
  monWedPrices: { ... },
  thurFriSunPrices: { ... },
  satPrices: { ... },
  happyHourPrices: { ... },
  funNightPrices: { ... },
  normalHourPrices: { ... },
  // ... pricing tier fields
}
```

**Queried as:**
```js
const doc = await db.collection('settings').doc('pricing').get();
```

> This is a single-document read. Very cheap. However, it's called independently in `sessionController.js` AND `ownerDashboardController.js` — deduplication via a shared config module would save reads.

---

### `deletion_logs`
Audit trail for deleted sessions and bookings.

```
{
  source: 'Active Session' | 'Upcoming Booking',
  targetId: string,                 // original document ID
  customerName: string,
  details: { ...full original document },
  deletedBy: string,                // 'owner' | 'employee'
  deletedByName: string,
  deletedAt: ISO string
}
```

**Queries:**
```js
db.collection('deletion_logs')
  .where('deletedAt', '>=', startDate.toISOString())
  .orderBy('deletedAt', 'desc').get()
```

---

### `management_subscriptions`
Cafe service subscriptions (PlayStation, internet, etc.)

```
{
  type: string,
  provider: string,
  cost: number,
  startDate: ISO string,
  expiryDate: ISO string,
  createdAt: ISO string
}
```

---

### `management_salaries`
Employee salary payment records.

```
{
  employeeName: string,
  amount: number,
  paymentDate: ISO string,
  notes: string,
  createdAt: ISO string
}
```

---

## Query Patterns per Controller

### sessionController.js

| Function | Reads | Writes |
|---|---|---|
| `getDeviceAvailability` | 1 (active sessions) | 0 |
| `createSession` | 2 (active sessions + pricing) + optional battelwinner read | 1 session write + optional coin deduct |
| `getActiveSessions` | 1 | 0 |
| `createBooking` | 3 (active sessions + bookings + pricing implicit) | 1 booking write |
| `getUpcomingBookings` | 1 | 0 |
| `exportSessions` | 2 (sessions + pricing) | 0 |
| `getDeviceAvailabilityForTime` | 2 (active sessions + bookings) | 0 |
| `updateSession` | 1 | 1 |
| `completeSession` | 0 | 1 |
| `deleteSession` | 1 | 1 delete + 1 audit log |
| `deleteBooking` | 1 | 1 delete + 1 audit log |
| `convertBookingsToSessions` | 1 (upcoming bookings) | N sessions created + N bookings updated |

### analyticsController.js (Consolidated)

| Function | Reads |
|---|---|
| `getDashboardData` | 3 parallel (last24h, active, monthly) |
| Individual endpoints (legacy) | 1 each — but these are now superseded by getDashboardData |

### ownerDashboardController.js

| Function | Reads |
|---|---|
| `getOwnerDashboardStats` | 1 |
| `getRevenueFlow` | 1 |
| `getRecentTransactions` | 1 |
| `getRevenueByMachine` | 2 (sessions + pricing) |
| `getDeletionLogs` | 1 |

---

## Index Requirements

Firestore composite indexes needed for the following queries:

| Collection | Fields | Direction | Used By |
|---|---|---|---|
| `sessions` | `createdAt` ASC | Single field | All analytics |
| `sessions` | `status` + `createdAt` DESC | Composite | Recent transactions |
| `bookings` | `status` + `bookingTime` ASC | Composite | getUpcomingBookings |
| `deletion_logs` | `deletedAt` + `deletedAt` DESC | Single field + orderBy | getDeletionLogs |
| `battelwinner` | `thunderCoins` DESC | Single field | Leaderboard |
| `battles` | `status` + `createdAt` | Composite | getActiveBattles (client sort) |

> If you see `FAILED_PRECONDITION` errors in logs referencing a missing index, a composite index needs to be created in the Firebase Console under Firestore → Indexes.

---

## Data Flow Diagrams

### Session Lifecycle
```
createSession()
  → Check active sessions (read)
  → Validate device availability
  → getPricingConfig() (read)
  → db.collection('sessions').add() (write)
  → If thunderCoinsUsed > 0: battelwinner.doc(phone).get() + .update() (read + write)
  → global.io.emit('session:started')

updateSession()
  → sessions.doc(id).get() (read)
  → sessions.doc(id).update({...all fields}) (write)
  → global.io.emit('session:updated')

completeSession()
  → sessions.doc(id).update({ status: 'completed' }) (write only)
  → global.io.emit('session:completed')

deleteSession()
  → sessions.doc(id).get() (read)
  → deletion_logs.add({...}) (write)
  → sessions.doc(id).delete() (write)
```

### Battle Lifecycle
```
startBattle()
  → battles.add({...}) (write)
  → io.emit('battle:started')

updateScore()
  → battles.doc(id).get() (read)
  → battles.doc(id).update({ score: FieldValue.increment(1) }) (write)
  → io.emit('battle:scoreUpdated')

finishBattle()
  → db.runTransaction():
      t.get(battleRef)          (transactional read)
      t.update(battleRef, { status: 'completed', winner })
      t.set(winnerRef, { thunderCoins: FieldValue.increment(15) }, { merge: true })
  → io.emit('battle:finished')
```

---

## Socket.IO Events

The backend emits the following Socket.IO events (no Firestore listeners involved):

| Event | Trigger | Payload |
|---|---|---|
| `session:started` | `createSession()` | session summary |
| `session:updated` | `updateSession()` | `{ sessionId }` |
| `session:completed` | `completeSession()` | `{ sessionId }` |
| `battle:started` | `startBattle()` | full battle data |
| `battle:scoreUpdated` | `updateScore()` | `{ battleId, player }` |
| `battle:finished` | `finishBattle()` | `{ battleId }` |

> **Important:** Socket.IO is for client notification only. It does NOT trigger additional Firestore reads on the server. All Firestore operations happen before the emit.
