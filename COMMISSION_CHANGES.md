# Commission Distribution Logic Change - Summary

## Overview
Changed the commission payout mechanism from "bulk payment at threshold" to "evenly distributed across threshold period".

---

## Previous Logic (Bulk Payment at Threshold)

### Example:
- **Total Payment**: 6,000,000
- **Commission Rate**: 10%
- **Total Commission**: 600,000
- **MinConsecutiveTenor**: 10
- **Total Installments**: 60 monthly

### Old Distribution:
- **Installments 1-9**: 10,000 each (10% of 100,000 per installment)
- **Installment 10**: **510,000** (bulk remainder = 600,000 - 90,000)
- **Installments 11-60**: No commission (already paid in full)

### Issues:
- Large bulk payment at installment 10
- Uneven distribution
- Marketing staff receives majority of commission at once

---

## New Logic (Evenly Distributed)

### Same Example:
- **Total Payment**: 6,000,000
- **Commission Rate**: 10%
- **Total Commission**: 600,000
- **MinConsecutiveTenor**: 10
- **Total Installments**: 60 monthly

### New Distribution:
- **Installments 1-10**: **60,000 each** (600,000 ÷ 10)
- **Installments 11-60**: No commission (already paid in full)

### Formula:
```typescript
const totalCommission = totalContractValue * commissionRate;
const commissionPerInstallment = totalCommission / minConsecutiveTenor;
```

### Benefits:
- ✅ Even distribution across threshold period
- ✅ Predictable commission amounts
- ✅ No large bulk payments
- ✅ Same total commission (600,000)

---

## Files Modified

### 1. `/src/app/api/payment/webhook/route.ts` (Lines 1102-1147)

**Changes:**
- Changed condition from `installmentNumber === minConsecutiveTenor` to `installmentNumber <= minConsecutiveTenor`
- Removed bulk commission calculation logic
- Added even distribution calculation:
  ```typescript
  const commissionPerInstallment = Math.round(totalCommission / minConsecutiveTenor);
  ```
- Updated `contractValue` to be proportional: `totalContractValue / minConsecutiveTenor`
- Updated log message to show `${installmentNumber}/${minConsecutiveTenor}`

---

### 2. `/src/lib/payment-processor.ts` (Lines 806-850)

**Changes:**
- Same changes as webhook route for consistency
- Changed condition from `installmentNumber === minConsecutiveTenor` to `installmentNumber <= minConsecutiveTenor`
- Removed bulk commission calculation logic
- Added even distribution calculation
- Updated logging

---

## Behavior Summary

| Installment # | Old Commission | New Commission |
|--------------|----------------|----------------|
| 1            | 10,000         | 60,000         |
| 2            | 10,000         | 60,000         |
| 3            | 10,000         | 60,000         |
| 4            | 10,000         | 60,000         |
| 5            | 10,000         | 60,000         |
| 6            | 10,000         | 60,000         |
| 7            | 10,000         | 60,000         |
| 8            | 10,000         | 60,000         |
| 9            | 10,000         | 60,000         |
| 10           | **510,000**    | 60,000         |
| 11-60        | 0              | 0              |
| **TOTAL**    | **600,000**    | **600,000**    |

---

## Key Points

1. **Total commission remains the same**: 600,000 in both cases
2. **Distribution is now even**: Each installment within the minConsecutiveTenor period gets equal commission
3. **No more bulk payment**: Eliminates the large one-time payout at the threshold
4. **Only applies to monthly payments**: Non-monthly (yearly, quarterly) still get per-installment commission
5. **After threshold**: No commission paid (installments 11-60), same as before

---

## Testing Considerations

- ✅ Verify commission totals match expected amounts
- ✅ Confirm even distribution across minConsecutiveTenor period
- ✅ Test with different commission rates (1%, 2%, 10%, etc.)
- ✅ Test with different minConsecutiveTenor values (5, 10, 15, etc.)
- ✅ Verify no commission created after threshold
- ✅ Verify yearly/quarterly installments still work correctly (not affected)

---

## Migration Notes

**Existing Contracts:**
- Contracts created before this change will continue using the old logic (stored `totalInstallments` in payment records)
- **New contracts** from this point forward will use the new even distribution logic
- No database migration needed - change is in calculation logic only

---

## Summary

✅ **Changed from**: Bulk payment at threshold installment
✅ **Changed to**: Even distribution across all threshold installments
✅ **Result**: More predictable, evenly distributed commission payments
✅ **Total commission**: Unchanged (same total amount)
