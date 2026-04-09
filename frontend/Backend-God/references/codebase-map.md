# Backend-God — Codebase Quick Reference

Fast lookup document for Thunder Management backend. Use this file when you need to quickly find a function, route, or pattern without reading the full SKILL-bg.md.

Read this file when asked to fix something and you need to quickly locate **which file** to open next.

---

## Controller → File Map

| What broke | Open this file |
|---|---|
| Session creation / device conflict | `backend/src/controllers/sessionController.js` → `createSession` (line ~93) |
| Session update / payment split | `backend/src/controllers/sessionController.js` → `updateSession` (line ~546) |
| Session complete | `backend/src/controllers/sessionController.js` → `completeSession` (line ~702) |
| Session delete (with audit log) | `backend/src/controllers/sessionController.js` → `deleteSession` (line ~720) |
| Upcoming booking list | `backend/src/controllers/sessionController.js` → `getUpcomingBookings` (line ~392) |
| Create booking | `backend/src/controllers/sessionController.js` → `createBooking` (line ~284) |
| Booking → session auto-convert | `backend/src/controllers/sessionController.js` → `convertBookingsToSessions` (line ~785) |
| Manual booking start | `backend/src/controllers/sessionController.js` → `startBooking` (line ~922) |
| Device availability (now) | `backend/src/controllers/sessionController.js` → `getDeviceAvailability` (line ~57) |
| Device availability (time range) | `backend/src/controllers/sessionController.js` → `getDeviceAvailabilityForTime` (line ~481) |
| Pricing wrong | `backend/src/utils/pricing.js` → `calculateSessionPrice` (line ~89) |
| Time window wrong (happy/normal/fun) | `backend/src/utils/pricing.js` → `isHappyHourTime`, `isNormalHourTime`, `isFunNightTime` |
| Analytics dashboard wrong | `backend/src/controllers/analyticsController.js` → `getDashboardData` (line ~391) |
| Analytics individual endpoint | `backend/src/controllers/analyticsController.js` (specific function above 391) |
| Owner KPI stats | `backend/src/controllers/ownerDashboardController.js` → `getOwnerDashboardStats` |
| Revenue chart wrong | `backend/src/controllers/ownerDashboardController.js` → `getRevenueFlow` |
| Revenue by machine wrong | `backend/src/controllers/ownerDashboardController.js` → `getRevenueByMachine` |
| Deletion audit log | `backend/src/controllers/ownerDashboardController.js` → `getDeletionLogs` |
| Auth 401 errors | `backend/src/middleware/auth.middleware.js` + `backend/src/config/firebase.js` |
| Pricing config GET/SET | `backend/src/controllers/pricingController.js` |
| Pricing default values | `backend/src/controllers/pricingController.js` → `getDefaultPricingConfig` |
| Battle start/score/finish | `backend/src/controllers/battleController.js` |
| ThunderCoin leaderboard | `backend/src/controllers/battleController.js` → `getThunderLeaderboard` |
| ThunderCoin player lookup | `backend/src/controllers/battleController.js` → `getThunderPlayer` |
| Snack inventory CRUD | `backend/src/controllers/snackController.js` |
| Snack stock deduction (transactional) | `backend/src/services/snackService.js` → `deductStock` |
| Customer subscriptions | `backend/src/controllers/subscriptionController.js` |
| Staff subscriptions | `backend/src/controllers/managementController.js` → `getSubscriptions` / `createSubscription` |
| Staff salaries | `backend/src/controllers/managementController.js` → `getSalaries` / `createSalary` |
| Booking auto-conversion scheduler | `backend/src/services/bookingScheduler.js` |
| Firebase init crash | `backend/src/config/firebase.js` |
| Device limits | `backend/src/config/deviceLimit.js` |
| Route not found / 404 | `backend/src/index.js` (check if route is mounted) |
| CORS errors | `backend/src/index.js` (cors origin list) |
| Socket.IO crash | `backend/server.js` + any controller with `global.io.emit` |

---

## Firestore Collection IDs

```
sessions              → Active + completed gaming sessions
bookings              → Upcoming pre-booked sessions  
snacks                → Snack inventory
battelwinner          → ThunderCoin leaderboard (note: "battel" not "battle")
battles               → Active/completed battles
settings/pricing      → Pricing configuration (single document)
subscriptions         → Customer subscriptions
management_subscriptions → Staff/cafe subscription costs
management_salaries   → Staff salary payment logs
deletion_logs         → Audit log for deleted sessions/bookings
```

> ⚠️ **Typo in production:** The collection is `battelwinner` (double-t) — not `battleWinner` or `battlewinners`. Do NOT change this — it would break all existing records.

---

## Key Exports Per File

### sessionController.js
```js
module.exports = {
  createSession, getActiveSessions,
  createBooking, getUpcomingBookings,
  exportSessions,
  getDeviceAvailability, getDeviceAvailabilityForTime,
  updateSession, completeSession,
  deleteSession, deleteBooking,
  convertBookingsToSessions, autoConvertBookings,
  startBooking
};
```

### analyticsController.js
```js
module.exports = {
  getDeviceOccupancyLast24Hours,
  getLast24HoursStats,
  getPeakHoursLast24Hours,
  getDeviceUsageLast24Hours,
  getSnacksConsumptionLast24Hours,
  getMonthlyGrowthComparison,
  getDashboardData        // ← Consolidated endpoint (use this)
};
```

### ownerDashboardController.js
```js
module.exports = {
  getOwnerDashboardStats,
  getRevenueFlow,
  getRecentTransactions,
  getRevenueByMachine,
  getDeletionLogs
};
```

### pricingController.js
```js
module.exports = { getPricing, updatePricing, getDefaultPricingConfig };
```

### utils/pricing.js
```js
module.exports = {
  isHappyHourTime,
  isFunNightTime,
  isNormalHourTime,
  calculateSessionPrice,
  calculateRevenueByMachine
};
```

### battleController.js
```js
exports.startBattle
exports.getActiveBattles
exports.updateScore
exports.finishBattle
exports.getCompletedBattles
exports.getThunderLeaderboard
exports.getThunderPlayer
```

---

## Common One-Liners

### Safe Timestamp Parse
```js
const date = val?.toDate ? val.toDate() : new Date(val);
```

### Safe Device Array Normalize
```js
const ids = Array.isArray(val) ? val : (typeof val === 'number' && val > 0 ? [val] : []);
```

### Atomic Counter Decrement (ThunderCoins)
```js
await playerRef.update({ thunderCoins: admin.firestore.FieldValue.increment(-amount) });
```

### Atomic Counter Increment (Scores, soldQuantity)
```js
await ref.update({ score: admin.firestore.FieldValue.increment(1) });
```

### Parallel Firestore Fetch
```js
const [snap1, snap2] = await Promise.all([query1.get(), query2.get()]);
```

### Safe io Emit
```js
if (global.io) { global.io.emit('event:name', payload); }
```

### IST Offset for Server UTC
```js
const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
const istHour = Math.floor((utcDate.getUTCHours() + 5.5) % 24);
```

---

## Route Prefix Map

```
/api/auth         → authRoutes.js
/api/sessions     → sessionRoutes.js
/api/battles      → battleRoutes.js
/api/analytics    → analyticsRoutes.js
/api/owner        → ownerRoute.js
/api/management   → managementRoutes.js
/api/subscription → subscriptionRoute.js
/api/snacks       → snackRoutes.js
/api/pricing      → pricingRoutes.js
/api/customers    → customerRoutes.js
```
