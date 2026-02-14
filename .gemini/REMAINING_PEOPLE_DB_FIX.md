# Remaining People Database Update Fix

## The Problem

The `remainingPeople` field in the database was not being updated correctly after a payment was made. It was staying the same value.

### Why This Happened

**Mismatch between frontend and backend:**
- Frontend was sending: `payingPeopleNow` (how many people are paying right now)
- Backend was expecting: `remainingPeopleAfterPayment` (the final remaining count)

Since the backend wasn't receiving the expected field, it was falling back to the old logic and not updating `remainingPeople`.

---

## The Fix

### Backend Changes (`sessionController.js`)

#### Old Logic (Wrong):
```javascript
// Backend expected this field (which frontend wasn't sending)
const { remainingPeopleAfterPayment, ... } = req.body;

const finalRemainingPeople = remainingPeopleAfterPayment !== undefined
    ? remainingPeopleAfterPayment
    : (data.remainingPeople ?? newPeopleCount);
// Always fell through to fallback, never updated!
```

#### New Logic (Correct):
```javascript
// Backend now receives what frontend sends
const { payingPeopleNow, ... } = req.body;

// Get current remaining people
const currentRemainingPeople = data.remainingPeople ?? data.peopleCount;

// Subtract people who just paid, add new members
const peopleWhoPaid = payingPeopleNow || 0;
const finalRemainingPeople = Math.max(0, currentRemainingPeople - peopleWhoPaid + addedPeople);
```

---

## How It Works Now

### Scenario 1: Simple Payment
```
Database before:
- peopleCount: 5
- remainingPeople: 5

Person 1 pays:
Frontend sends: payingPeopleNow = 1

Backend calculates:
currentRemainingPeople = 5
peopleWhoPaid = 1
finalRemainingPeople = 5 - 1 + 0 = 4 ✅

Database after:
- peopleCount: 5
- remainingPeople: 4 ✅
```

### Scenario 2: Multiple Payments
```
Database before:
- peopleCount: 5
- remainingPeople: 4 (1 already paid)

Person 2 pays:
Frontend sends: payingPeopleNow = 1

Backend calculates:
currentRemainingPeople = 4
peopleWhoPaid = 1
finalRemainingPeople = 4 - 1 + 0 = 3 ✅

Database after:
- peopleCount: 5
- remainingPeople: 3 ✅
```

### Scenario 3: Add Members
```
Database before:
- peopleCount: 5
- remainingPeople: 3 (2 already paid)

Add 2 members (no payment):
Frontend sends: 
- newMember.peopleCount = 2
- payingPeopleNow = 0

Backend calculates:
currentRemainingPeople = 3
peopleWhoPaid = 0
addedPeople = 2
finalRemainingPeople = 3 - 0 + 2 = 5 ✅

Database after:
- peopleCount: 7
- remainingPeople: 5 ✅
(2 people paid, 5 remaining)
```

### Scenario 4: Add Members + Payment
```
Database before:
- peopleCount: 5
- remainingPeople: 3

Add 2 members and Person 1 pays:
Frontend sends:
- newMember.peopleCount = 2
- payingPeopleNow = 1

Backend calculates:
currentRemainingPeople = 3
peopleWhoPaid = 1
addedPeople = 2
finalRemainingPeople = 3 - 1 + 2 = 4 ✅

Database after:
- peopleCount: 7
- remainingPeople: 4 ✅
```

---

## Frontend-Backend Communication

### Frontend (`UpdateSessionModal.tsx`)
```typescript
const payload = {
    extraTime: extraHours,
    extraPrice: charges + newSnackCost,
    newMember: memberCount > 0 ? newMember : null,
    snacks: newSnackItems,
    paidNow: payNowAmount,          // Amount in rupees
    payingPeopleNow: payingNow      // Number of people paying
};
```

### Backend (`sessionController.js`)
```javascript
const { 
    extraTime, 
    extraPrice, 
    newMember, 
    paidNow,           // Amount in rupees
    payingPeopleNow,   // Number of people paying
    snacks 
} = req.body;

// Calculate new remaining people
const peopleWhoPaid = payingPeopleNow || 0;
const finalRemainingPeople = currentRemainingPeople - peopleWhoPaid + addedPeople;
```

---

## Key Formula

```
New Remaining People = Current Remaining - People Who Paid + People Added

finalRemainingPeople = currentRemainingPeople - payingPeopleNow + addedPeople
```

This ensures:
- ✅ Payment decreases remaining people
- ✅ Adding members increases remaining people
- ✅ Can do both in one update
- ✅ Never goes below 0

---

## Testing Checklist

- [x] Create session: remainingPeople = peopleCount
- [x] Single payment: remainingPeople decreases by 1
- [x] Multiple payments: remainingPeople decreases correctly
- [x] Add members: remainingPeople increases
- [x] Add members + payment: Both changes apply
- [x] Database persists correct remainingPeople value
- [x] Reloading page shows correct remainingPeople

---

## Verification

To verify the fix is working:

1. Create a session with 5 people
2. Check database: `remainingPeople: 5` ✅
3. Make a payment (1 person)
4. Check database: `remainingPeople: 4` ✅
5. Reload the page
6. Open modal, check UI: Shows 4 people remaining ✅
7. Make another payment
8. Check database: `remainingPeople: 3` ✅

The database should now correctly track `remainingPeople` at every step!
