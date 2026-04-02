# Security Rules Reference
# Thunder Firebase Backend

## Important Note

Because this project uses the **Firebase Admin SDK** exclusively on the server side, all Firestore interactions **bypass Firestore Security Rules**. Security is enforced at the **Express middleware layer**.

This document covers:
1. Server-side security patterns (what's currently enforced)
2. Security gaps to watch for
3. Firestore Security Rules templates (for if/when client-side access is added)
4. Input validation requirements

---

## Current Security Model

```
Browser (Client)
  → Firebase Auth (client-side signInWithEmailAndPassword)
  → Gets Firebase ID Token
  → Sends token in Authorization header to Express API
  
Express Backend
  → verifyToken middleware: auth.verifyIdToken(token)
  → Role check middleware: check db.collection('users').doc(uid) for role
  → Controller logic (admin SDK — bypasses rules)
  → Firestore
```

---

## Authentication Flow

### Client-Side Login
- Firebase Authentication handles credentials
- Backend NEVER receives passwords
- `loginUser()` in authController.js returns instructions to use Firebase SDK — it does not authenticate
- After client-side login, client sends `Authorization: Bearer <idToken>` header

### Backend Token Verification Pattern
```js
// middleware/verifyToken.js (pattern — implement if not present)
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded; // { uid, email, ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

### Role Check Pattern
```js
// After verifyToken, get user role from Firestore
const getUserRole = async (req, res, next) => {
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  if (!userDoc.exists) return res.status(403).json({ message: 'Profile not found' });
  req.userRole = userDoc.data().role; // 'owner' | 'employee'
  next();
};
```

---

## Input Validation Requirements

### Before Any Firestore Write, Validate:

**Session creation:**
- `customerName`: non-empty string
- `contactNumber`: numeric string (optional but if present, validate format)
- `duration`: positive number, reasonable max (e.g., ≤ 24h)
- `peopleCount`: positive integer
- `devices`: valid device types only (`ps`, `pc`, `vr`, `wheel`, `metabat`), IDs within limits
- `price`: positive number
- `thunderCoinsUsed`: non-negative, integer — **must be capped server-side**: `Math.min(currentCoins, thunderCoinsUsed)`

**ThunderCoins anti-cheat (currently in createSession):**
```js
const safeDeduction = Math.min(currentCoins, thunderCoinsUsed);
// This is correct — prevents frontend from sending inflated coin amounts
// Ensure this guard is present everywhere coins are deducted
```

**Battle creation:**
- Both player `name` and `phone` required
- `phone`: must match `/^\d{10}$/`
- `entryFee`: non-negative number
- `gameType`/`matchType`: whitelist from allowed values

**User registration:**
- `role`: must be one of `['employee', 'owner']` — currently enforced ✅
- `email`: format validation — currently enforced ✅
- `username`: uniqueness checked via Firestore query — currently enforced ✅

---

## Security Gap Analysis

### GAP-01: Missing Token Verification on Many Routes
**Risk:** If routes are publicly accessible without token verification, anyone can read/write session data.

**Audit all routes in `src/routes/` to confirm:**
- Which routes have `verifyToken` middleware applied
- Which routes are intentionally public (e.g., a health check at `/`)
- Ensure owner-only routes (`/api/owner/`, deletion, pricing) require `role === 'owner'`

---

### GAP-02: ThunderCoin Deduction Is Read-Then-Write
**Risk:** Race condition if two requests deduct coins simultaneously.

**Current code:**
```js
const playerSnap = await playerRef.get();
const currentCoins = playerSnap.data().thunderCoins || 0;
await playerRef.update({ thunderCoins: currentCoins - safeDeduction });
```

**Risk level:** Low in practice (unlikely two sessions created simultaneously for same player), but not atomic.

**Fix:** Use transaction for coin operations involving validation:
```js
await db.runTransaction(async t => {
  const snap = await t.get(playerRef);
  const current = snap.exists ? (snap.data().thunderCoins || 0) : 0;
  const safe = Math.min(current, thunderCoinsUsed);
  if (safe > 0) {
    t.update(playerRef, {
      thunderCoins: admin.firestore.FieldValue.increment(-safe),
      updatedAt: new Date().toISOString()
    });
  }
});
```

---

### GAP-03: Snack Inventory Stock Check Not in Transaction at Session Creation
**Current:** `snackService.deductStock()` uses a transaction internally — this is correct.

**Watch for:** If `deductStock` is called before the session availability check and the session creation fails, snacks are already deducted. Consider wrapping the entire `createSession` in a transaction or using a compensating rollback.

---

### GAP-04: Deletion Logs Written Before Delete
**Current pattern:**
```js
await db.collection('deletion_logs').add({...}); // Write 1
await docRef.delete();                           // Write 2
```

**Risk:** If the delete fails, a false deletion log exists. Wrap in a batch:
```js
const batch = db.batch();
const logRef = db.collection('deletion_logs').doc();
batch.set(logRef, { ...auditData });
batch.delete(docRef);
await batch.commit(); // atomic
```

---

## Firestore Security Rules Template

> **Apply these rules if/when client-side Firestore SDK access is introduced.**
> Currently not applicable since Admin SDK bypasses rules.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isOwner() {
      return isAuthenticated() && getUserData().role == 'owner';
    }
    
    function isEmployee() {
      return isAuthenticated() && (getUserData().role == 'employee' || getUserData().role == 'owner');
    }
    
    // Sessions: employees can read active sessions, owners can read all
    match /sessions/{sessionId} {
      allow read: if isEmployee();
      allow create: if isEmployee();
      allow update: if isEmployee();
      allow delete: if isOwner(); // Only owners can delete sessions
    }
    
    // Bookings
    match /bookings/{bookingId} {
      allow read: if isEmployee();
      allow create: if isEmployee();
      allow update: if isEmployee();
      allow delete: if isOwner();
    }
    
    // Battles and leaderboard
    match /battles/{battleId} {
      allow read: if isEmployee();
      allow create, update: if isEmployee();
      allow delete: if isOwner();
    }
    
    match /battelwinner/{phone} {
      allow read: if isEmployee(); // Public leaderboard could also be: allow read: if true;
      allow write: if isOwner(); // Only server (admin SDK) should write this
    }
    
    // Users: each user can read their own profile, owner can read all
    match /users/{userId} {
      allow read: if request.auth.uid == userId || isOwner();
      allow create: if isOwner(); // Registration handled server-side
      allow update: if isOwner();
      allow delete: if isOwner();
    }
    
    // Snacks: employees can view, owners can modify
    match /snacks/{snackId} {
      allow read: if isEmployee();
      allow write: if isOwner();
    }
    
    // Settings (pricing): employees can read, only owners can write
    match /settings/{settingId} {
      allow read: if isEmployee();
      allow write: if isOwner();
    }
    
    // Audit logs: read-only for owners, write via server only
    match /deletion_logs/{logId} {
      allow read: if isOwner();
      allow write: if false; // Server (admin SDK) only
    }
    
    // Management data: owner only
    match /management_subscriptions/{id} {
      allow read, write: if isOwner();
    }
    
    match /management_salaries/{id} {
      allow read, write: if isOwner();
    }
  }
}
```

---

## Security Best Practices Checklist

When reviewing any endpoint:

- [ ] Is the route protected by token verification middleware?
- [ ] Does the operation require owner role? Is that enforced?
- [ ] Is all user input validated before touching Firestore?
- [ ] Are ThunderCoins operations using `Math.min()` guard against over-deduction?
- [ ] Are multi-document writes atomic (transaction or batch)?
- [ ] Does deletion include an audit log write?
- [ ] Is the response carefully scoped — never returning more data than the client needs?
- [ ] Are error messages generic enough to not leak internal implementation details?
- [ ] Is `bcrypt` used if passwords are ever stored (currently not — auth is purely Firebase Auth)?
