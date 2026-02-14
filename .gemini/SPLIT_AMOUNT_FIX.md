# Split Amount Logic Fix

## Problem

There were TWO critical bugs in the split amount calculation:

### Bug 1: Using remainingAmount instead of total price for finalBill

```typescript
❌ WRONG:
const finalBill = (session.remainingAmount ?? session.price) + chargesAsString;
const perPersonShare = finalBill / totalPeople;

Example:
- Total: ₹370 for 5 people
- Person 1 pays: ₹74
- Remaining: ₹296
- When reopening modal:
  - finalBill = ₹296 (using remainingAmount!)
  - perPersonShare = ₹296 / 5 = ₹59.2 ❌ WRONG!
  - Should be ₹74!
```

**THE CRITICAL FIX:**
```typescript
✅ CORRECT:
const finalBill = session.price + chargesAsString;
const perPersonShare = finalBill / totalPeople;

Example:
- Total: ₹370 for 5 people
- Person 1 pays: ₹74
- Remaining: ₹296
- When reopening modal:
  - finalBill = ₹370 (using session.price!)
  - perPersonShare = ₹370 / 5 = ₹74 ✅ CORRECT!
```

### Bug 2: Re-dividing amounts (original bug)

The split amount calculation was causing a loss because the total amount was being divided twice:

1. **Initial Division**: Total bill ÷ Total people = Per person share
2. **Payment Made**: 1 person pays their share
3. **Re-division Bug**: Remaining amount ÷ Remaining people = New per person share
4. **Result**: Each subsequent payment was based on a recalculated share, which created discrepancies

### Example of the Bug:
```
Session: ₹1000, 4 people
Per person: ₹1000 ÷ 4 = ₹250

Person 1 pays: ₹250
Remaining: ₹750 for 3 people

❌ OLD LOGIC (BUGGY):
  - Recalculate: ₹750 ÷ 3 = ₹250 per person
  - Person 2 pays: ₹250
  - Remaining: ₹500 for 2 people
  - Person 3 pays: ₹500 ÷ 2 = ₹250
  - Person 4 should pay: ₹250
  - Total collected: ₹1000 ✓ (works if everyone pays)
  
  BUT if charges are added:
  - Add ₹200 charges → New total: ₹1200
  - Already paid: ₹250 (1 person)
  - Remaining: ₹950 for 3 people
  - NEW per person = ₹1200 ÷ 4 = ₹300
  - But the calculation shows: ₹950 ÷ 3 = ₹316.67
  - This creates inconsistency!
```

## Solution
Track **actual amounts** instead of recalculating shares:

### Frontend (UpdateSessionModal.tsx)
```typescript
// Calculate fixed per-person share from FINAL total
const perPersonShare = finalBill / totalPeople;

// Track actual amounts
const alreadyPaidAmount = session.paidAmount || 0;
const payNowAmount = payingNow * perPersonShare;

// Remaining is simply: Total - Paid
const newRemainingAmount = Math.max(0, finalBill - alreadyPaidAmount - payNowAmount);
```

### Backend (sessionController.js)
```javascript
// Track actual amounts paid
const totalPrice = data.price + (extraPrice || 0);
const alreadyPaidAmount = data.paidAmount || 0;
const currentPayment = paidNow || 0;
const newTotalPaid = alreadyPaidAmount + currentPayment;

// Remaining is: Total - Paid
const remainingAmount = Math.max(0, totalPrice - newTotalPaid);
```

### Corrected Example:
```
Session: ₹1000, 4 people
Per person share: ₹1000 ÷ 4 = ₹250 (FIXED)

Person 1 pays: ₹250
Total paid: ₹250
Remaining: ₹1000 - ₹250 = ₹750 ✓

Add ₹200 charges:
New total: ₹1200
NEW per person: ₹1200 ÷ 4 = ₹300 (RECALCULATED)
Already paid: ₹250
Person 2 pays: ₹300
Total paid: ₹550
Remaining: ₹1200 - ₹550 = ₹650 ✓

Person 3 pays: ₹300
Total paid: ₹850
Remaining: ₹1200 - ₹850 = ₹350 ✓

Person 4 pays: ₹300
Total paid: ₹1150
Remaining: ₹1200 - ₹1150 = ₹50 ✓
(Still ₹50 pending from Person 1's old share)

This is CORRECT! No money lost.
```

## Key Changes

### 1. Frontend (`UpdateSessionModal.tsx`)
- ✅ Calculate `perPersonShare` from `finalBill / totalPeople`
- ✅ Track `alreadyPaidAmount` (actual money paid)
- ✅ Calculate `newRemainingAmount = finalBill - alreadyPaidAmount - payNowAmount`
- ✅ Use `Math.max(0, ...)` to prevent negative amounts

### 2. Backend (`sessionController.js`)
- ✅ Track `newTotalPaid = alreadyPaidAmount + currentPayment`
- ✅ Calculate `remainingAmount = totalPrice - newTotalPaid`
- ✅ Store `paidAmount` and `remainingAmount` in database
- ✅ `paidPeople` is kept for reference/display only

## Benefits
1. **No Loss**: Money is never double-counted or lost
2. **Accurate Tracking**: Remaining amount always equals Total - Paid
3. **Consistent**: Works correctly when charges are added mid-session
4. **Simple**: Easy to understand and maintain

## Testing Checklist
- [ ] Test split payment with 4 people
- [ ] Test adding time/members/snacks mid-session
- [ ] Test partial payments
- [ ] Verify remaining amount is correct after each payment
- [ ] Test edge case: All people pay at once
- [ ] Test edge case: Pay more than share (overpayment)
