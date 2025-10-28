# Dynamic Duration Implementation - Summary of Changes

## Overview
Changed the system from hardcoded 5-year investment duration to dynamic duration per plant type. Now each plant can have different investment durations (e.g., 3, 5, 8 years), and the installment calculations automatically adjust.

## Formula Changes
### Before:
- **Monthly**: Always 60 installments (5 years × 12 months)
- **Yearly**: Always 5 installments (5 years)

### After:
- **Monthly**: `durationYears × 12` installments (e.g., 8 years = 96 months)
- **Yearly**: `durationYears` installments (e.g., 8 years = 8 yearly)

---

## Files Modified

### 1. **Schema Updates**

#### `/src/models/PlantType.ts`
- **Added** `durationYears: number` field to `IInvestmentPlan` interface
- **Added** `durationYears` to `InvestmentPlanSchema` with default value of 5, min 1, max 20

#### `/src/models/Contract.ts`
- **Added** `durationYears?: number` field to `IContract` interface
- **Added** `durationYears` field to `ContractSchema` with min 1, max 20

---

### 2. **Frontend Components**

#### `/src/components/landing/CicilanModal.tsx`
**Changes:**
- **Added** `durationYears` extraction from plan: `const durationYears = plan?.investmentPlan?.durationYears || 5`
- **Updated** `getInstallmentCount()` function:
  - Monthly: `return durationYears * 12` (was hardcoded 60)
  - Yearly: `return durationYears` (was hardcoded 5)
- **Updated** `generateContractDetails()` to include `durationYears` in both try and catch blocks
- **Updated** contract creation API call to pass `durationYears`

**Lines Changed:** 66-77, 131-136, 157-163, 231-239

---

#### `/src/app/admin/plant-showcase/page.tsx`
**Changes:**
- **Added** `durationYears: number` to `Plant` interface
- **Added** extraction of `durationYears` in `transformOldToNew()`: defaults to 5
- **Added** `durationYears` handling in `handlePriceUpdate()` function
- **Added** `durationYears` to `transformNewToOld()` for saving to database
- **Added** UI section "3. Durasi Investasi" with number input for admins to set duration (1-20 years)
- **Updated** "Estimasi Return" section to show dynamic duration in label

**Lines Changed:** 23-41, 73-95, 222-231, 254-264, 765-806

---

### 3. **Backend API Routes**

#### `/src/app/api/contract/create/route.ts`
**Changes:**
- **Added** `durationYears` to request body destructuring
- **Added** `durationYears` to contract creation for cicilan payments

**Lines Changed:** 22-32, 171-177

---

#### `/src/app/api/cicilan/create/route.ts`
**Changes:**
- **Replaced** hardcoded calculation:
  ```typescript
  // OLD
  const totalInstallments = Math.ceil(60 / paymentTermMonths); // 5 years
  
  // NEW
  const durationYears = contract.durationYears || 5; // Default to 5 if not set
  const totalMonths = durationYears * 12; // e.g., 5 years = 60 months, 8 years = 96 months
  const totalInstallments = Math.ceil(totalMonths / paymentTermMonths);
  ```

**Lines Changed:** 106-120

---

### 4. **Other API Routes (Already Using Stored Values)**

The following routes **DO NOT need changes** because they read `totalInstallments` from the Payment/Contract records that were already calculated correctly:

- `/src/app/api/payment/webhook/route.ts` - Uses `payment.totalInstallments`
- `/src/app/api/admin/cicilan/review-installment/route.ts` - Uses `payment.totalInstallments`
- `/src/app/api/contract/[contractId]/route.ts` - Uses `contract.totalInstallments`
- `/src/app/api/cicilan/user/route.ts` - Uses stored `totalInstallments`

---

## How It Works

### Flow:
1. **Admin sets duration**: Admin goes to plant-showcase page and sets `durationYears` (e.g., 8 years)
2. **User selects plant**: User sees plant with the configured duration
3. **Cicilan calculation**: 
   - Frontend: `CicilanModal` calculates installments using `durationYears * 12` for monthly
   - Backend: `/api/cicilan/create` uses `contract.durationYears` from database
4. **Contract stores value**: Duration is stored in contract for reference
5. **Subsequent installments**: All future installment calculations use the stored `totalInstallments`

### Example:
- **5-year plant**: 60 monthly or 5 yearly installments
- **8-year plant**: 96 monthly or 8 yearly installments
- **3-year plant**: 36 monthly or 3 yearly installments

---

## Testing Checklist

- [ ] Admin can set different durations (3, 5, 8, etc.) per plant type
- [ ] Frontend calculations show correct installment counts
- [ ] Contracts are created with correct `durationYears` value
- [ ] First installment payment is created with correct `totalInstallments`
- [ ] Subsequent installments are created correctly by webhook
- [ ] All payment flows work for different durations
- [ ] UI displays dynamic duration instead of hardcoded "5 tahun"

---

## Migration Notes

**Default Behavior**: All existing plants without `durationYears` will default to 5 years (backward compatible).

**Database Update**: Existing PlantType documents will need to have `durationYears: 5` added via migration script or admin UI update.

---

## Summary

✅ **Schema**: Added `durationYears` field to PlantType and Contract models
✅ **Frontend**: Updated CicilanModal to use dynamic duration
✅ **Backend**: Updated cicilan/create API to calculate using dynamic duration
✅ **Admin UI**: Added duration input field for admins to configure per plant
✅ **Backward Compatible**: Defaults to 5 years if not set
