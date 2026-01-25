# Implementation Plan: Dynamic Commission System & SPPG Discount

**Created**: 2026-01-25  
**Updated**: 2026-01-25  
**Status**: ✅ Implemented  
**Complexity**: High  

---

## Executive Summary

This plan outlines changes to implement:
1. **Dynamic per-referral commission rates** (configurable by head marketing)
2. **SPPG occupation type** with special discount and commission split logic

---

## Current State Analysis

### Commission System
| Component | Current State |
|-----------|---------------|
| Commission Rate | Global 2% stored in `Settings.config.commissionRate` |
| Who Can Update | Only `admin` role via `/api/settings/commission-rate` |
| Storage | `Settings` model (single global value) |
| Calculation | `contractValue * commissionRate` in `payment-processor.ts` |

### User/Referral System
| Component | Current State |
|-----------|---------------|
| Referral Code | 6-char alphanumeric on `User.referralCode` |
| Per-Referral Settings | **Does not exist** |
| Occupation Options | 20 options in `src/constant/OCCUPATION.ts` |
| SPPG Occupation | **Does not exist** |

### Checkout Modals
| Component | Current State |
|-----------|---------------|
| PlantShowcaseSection.tsx | Has referral input, no discount logic |
| CicilanModal.tsx | Has referral input, no discount logic |
| Price Display | Shows fixed product price |

---

## Requirements Breakdown

### Requirement 1: Dynamic Commission Rate (Per-Referral)

**Goal**: Head marketing can set commission percentage per marketing staff's referral code.

| Aspect | Specification |
|--------|---------------|
| Storage | New `commissionPercentage` field per referral code |
| Default | Falls back to global rate if not set |
| Who Can Set | `marketing_head` role |
| Range | 0% to 100% |
| Customer Impact | **None** - customer pays same price |

### Requirement 2: SPPG User Handling

**Goal**: Users with `occupation = "sppg"` get special discount and commission split.

| Aspect | Specification |
|--------|---------------|
| Discount | Equal to referral's commission percentage (e.g., 30% → pays 70%) |
| Company Cut | Head marketing sets 0% to (commission% - 1%) |
| Marketing Commission | Remaining % after company cut |
| Example | 30% commission, 20% company cut → Marketing gets 10%, Company gets 20%, Customer pays 70% |

---

## Clarified Requirements (Product Owner Answers)

| Question | Answer | Implementation Impact |
|----------|--------|----------------------|
| **Q1: Per-Referral Commission Storage** | **Option A** - Add to User model | Add `customCommissionRate`, `companyCutRate` to User model |
| **Q2: Company Cut Storage** | **Option A** - Per-referral | Each marketing staff has their own companyCutRate |
| **Q3: SPPG Discount Trigger** | **Option A** - Only with valid referral code | No discount if SPPG user skips referral code (normal flow) |
| **Q4: Role Permissions** | **Option B** - marketing_head AND admin | Both roles can set per-referral commission |

### Additional Clarifications

| Question | Answer |
|----------|--------|
| SPPG user without referral code? | No discount, normal flow like other users |
| Default customCommissionRate for existing marketing staff? | **YES** - all marketing staff AND marketing_head get default rate |
| Minimum commission rate? | **NO** minimum (can be 0%) |
| Discount visible before referral code? | **NO** - only shown after referral code validated, on the modal |
| Deactivated referral code owner? | **Validation fails** - user sees error |

---

## Proposed Data Model Changes

### 1. User Model (for Marketing Staff)

```typescript
// Add to User model (src/models/User.ts)
interface IUser {
  // ... existing fields ...
  
  // New fields for marketing staff
  customCommissionRate?: number;  // Override global rate (0.00 to 1.00)
  companyCutRate?: number;        // For SPPG: company's cut (0.00 to customCommissionRate)
}
```

### 2. Occupation Options

```typescript
// Add to src/constant/OCCUPATION.ts
{ value: "sppg", label: "SPPG", code: "SP" }
```

### 3. Payment/Contract Model (Track Discount)

```typescript
// Add to Payment model
interface IPayment {
  // ... existing fields ...
  
  // New fields for SPPG discount tracking
  originalAmount?: number;      // Price before discount
  discountPercentage?: number;  // SPPG discount applied
  discountAmount?: number;      // Amount discounted
  isSppgDiscount?: boolean;     // Flag for SPPG discount
}
```

### 4. CommissionHistory Model (Track Split)

```typescript
// Add to CommissionHistory model
interface ICommissionHistory {
  // ... existing fields ...
  
  // New fields for SPPG commission split
  companyCutRate?: number;      // Company's cut percentage
  companyCutAmount?: number;    // Amount to company
  isSppgTransaction?: boolean;  // Flag for SPPG transactions
}
```

---

## Implementation Tasks

### Phase 1: Database & Model Changes

| # | Task | Files | Estimate |
|---|------|-------|----------|
| 1.1 | Add `customCommissionRate` and `companyCutRate` to User model | `src/models/User.ts` | Small |
| 1.2 | Add SPPG discount fields to Payment model | `src/models/Payment.ts` | Small |
| 1.3 | Add company cut fields to CommissionHistory model | `src/models/CommissionHistory.ts` | Small |
| 1.4 | Add SPPG to occupation options | `src/constant/OCCUPATION.ts` | Trivial |

### Phase 2: API Changes

| # | Task | Files | Estimate |
|---|------|-------|----------|
| 2.1 | Create API to get/set per-referral commission | `src/app/api/admin/marketing/referral-settings/route.ts` | Medium |
| 2.2 | Create API to validate referral and get discount info | `src/app/api/referral/validate/route.ts` | Medium |
| 2.3 | Update commission calculation logic | `src/lib/payment-processor.ts`, `src/lib/commission.ts` | Medium |
| 2.4 | Update webhook to handle SPPG split | `src/app/api/payment/webhook/route.ts` | Medium |

### Phase 3: Head Marketing UI

| # | Task | Files | Estimate |
|---|------|-------|----------|
| 3.1 | Add commission settings column to marketing staff table | `src/app/marketing/page.tsx` | Medium |
| 3.2 | Create modal to edit per-referral commission | `src/app/marketing/page.tsx` | Medium |
| 3.3 | Add company cut input (for SPPG) | `src/app/marketing/page.tsx` | Small |

### Phase 4: Customer Checkout UI

| # | Task | Files | Estimate |
|---|------|-------|----------|
| 4.1 | Update PlantShowcaseSection to show SPPG discount | `src/components/landing/PlantShowcaseSection.tsx` | Medium |
| 4.2 | Update CicilanModal to show SPPG discount | `src/components/landing/CicilanModal.tsx` | Medium |
| 4.3 | Add referral validation with discount preview | Both modals | Medium |

### Phase 5: Contract & Payment Flow

| # | Task | Files | Estimate |
|---|------|-------|----------|
| 5.1 | Update contract creation to store discount info | `src/app/api/contract/create/route.ts` | Medium |
| 5.2 | Update payment creation to apply discount | `src/app/api/payment/*/route.ts` | Medium |
| 5.3 | Update invoice/receipt to show discount | Various | Small |

---

## Detailed Flow Diagrams

### Flow 1: Regular User (Non-SPPG) with Referral

```
1. User enters referral code at checkout
2. System validates referral code
3. Price remains unchanged
4. On payment success:
   - Marketing gets: contractValue × customCommissionRate (or global rate)
   - Company gets: 0
   - Customer paid: Full price
```

### Flow 2: SPPG User with Referral

```
1. SPPG user enters referral code at checkout
2. System validates referral code
3. System fetches referral's customCommissionRate (e.g., 30%)
4. Discount applied: Customer pays 70% of price
5. On payment success:
   - Company gets: contractValue × companyCutRate (e.g., 20%)
   - Marketing gets: contractValue × (customCommissionRate - companyCutRate) (e.g., 10%)
   - Customer paid: 70% of original price

Example with Rp 1,000,000 product:
- Original: Rp 1,000,000
- SPPG Discount (30%): Rp 300,000
- Customer Pays: Rp 700,000
- Company Cut (20%): Rp 200,000
- Marketing Commission (10%): Rp 100,000
```

### Flow 3: SPPG User WITHOUT Referral

```
1. SPPG user does NOT enter referral code
2. No discount applied - normal checkout flow (same as non-SPPG)
3. Customer pays full price
4. No commission generated
```

---

## Implementation Checklist

### Phase 1: Database & Model Changes
- [x] 1.1 Add `customCommissionRate` and `companyCutRate` to User model (`src/models/User.ts`)
- [x] 1.2 Add SPPG discount fields to Payment model (`src/models/Payment.ts`): `originalAmount`, `discountPercentage`, `discountAmount`, `isSppgDiscount` *(already existed)*
- [x] 1.3 Add company cut fields to CommissionHistory model (`src/models/CommissionHistory.ts`): `companyCutRate`, `companyCutAmount`, `isSppgTransaction` *(already existed)*
- [x] 1.4 Add SPPG to occupation options (`src/constant/OCCUPATION.ts`): `{ value: "sppg", label: "SPPG", code: "SP" }`
- [x] 1.5 Create migration script to set default `customCommissionRate` for existing marketing staff (use global rate from Settings) → `scripts/migrate-marketing-commission.ts`
- [x] 1.6 **NEW**: Add `lockedCommissionRate` and `lockedCompanyCutRate` to Contract model (lock rates at creation) *(already existed)*

### Phase 2: API Changes
- [x] 2.1 Create/Update referral validation API to return discount info for SPPG users (`src/app/api/referral/validate/route.ts`)
      - [x] Add: Return `customCommissionRate` when user occupation is SPPG
      - [x] Add: Calculate and return discount amount
      - [x] Add: Check for deactivated marketing staff (isActive: false) and return error
- [x] 2.2 Create API for marketing_head/admin to set per-referral commission (`src/app/api/admin/marketing/referral-settings/route.ts`)
      - [x] GET: Fetch marketing staff's current commission settings
      - [x] PUT: Update `customCommissionRate` and `companyCutRate`
      - [x] Validation: `companyCutRate` must be less than `customCommissionRate`
      - [x] **NEW**: Log rate changes to audit trail (who/when/old→new) → console.log audit
- [x] 2.3 Update commission calculation logic (`src/lib/commission.ts`)
      - [x] Use `customCommissionRate` if set, otherwise fall back to global rate
      - [x] For SPPG transactions: calculate company cut vs marketing commission split
- [x] 2.4 Update payment webhook to handle SPPG commission split (`src/app/api/payment/webhook/route.ts`)
      - [x] Detect SPPG transactions via `isSppgDiscount` flag
      - [x] Create CommissionHistory with `companyCutAmount` and `isSppgTransaction`
      - [x] **NEW**: Use locked rates from Contract, NOT current User rates

### Phase 3: Head Marketing UI (Commission Settings)
- [x] 3.1 Add commission settings column to marketing staff table (`src/app/marketing/page.tsx`)
      - [x] Show current `customCommissionRate` (or "Default" if not set)
      - [x] Show `companyCutRate` for SPPG
- [x] 3.2 Create modal to edit per-referral commission (`src/app/marketing/page.tsx`)
      - [x] Input for `customCommissionRate` (0-100%)
      - [x] Input for `companyCutRate` (0 to customCommissionRate-1%)
      - [x] Validation messages
- [x] 3.3 Update staff table to display commission rate next to referral code → Added "Rate Komisi" column

### Phase 4: Customer Checkout UI (SPPG Discount)
- [x] 4.1 Update PlantShowcaseSection to show SPPG discount (`src/components/landing/PlantShowcaseSection.tsx`)
      - [x] After referral code validation, check if user occupation is "sppg"
      - [x] If SPPG + valid referral: show discount preview in confirmation modal
      - [x] Display: Original price (strikethrough), Discount %, Final price
- [x] 4.2 Update CicilanModal to show SPPG discount (`src/components/landing/CicilanModal.tsx`)
      - [x] Same logic as PlantShowcaseSection
      - [x] Calculate discounted installment amounts
- [x] 4.3 Add API call in both modals to validate referral and get discount info

### Phase 5: Contract & Payment Flow
- [x] 5.1 Update contract creation to store discount info (`src/app/api/contract/create/route.ts`)
      - [x] **SECURITY**: Backend fetches user occupation from session, NOT request
      - [x] **SECURITY**: Backend fetches marketing staff's rate, NOT from request
      - [x] **SECURITY**: Backend calculates discount server-side
      - [x] Store locked rates: `lockedCommissionRate`, `lockedCompanyCutRate`
      - [x] Store in Contract model for audit
- [x] 5.2 Update payment creation to apply discount (`src/app/api/cicilan/create/route.ts`)
      - [x] Use discounted amount for actual payment (via contract.totalAmount which is already discounted)
      - [x] Store original amount for records (copies from contract)
      - [x] Use locked rates from Contract
- [ ] 5.3 Update invoice/receipt generation to show discount details *(NOT DONE - low priority)*

---

## File Change Summary

| File | Changes |
|------|---------|
| `src/models/User.ts` | Add `customCommissionRate`, `companyCutRate` |
| `src/models/Payment.ts` | Add discount tracking fields |
| `src/models/CommissionHistory.ts` | Add company cut fields |
| `src/constant/OCCUPATION.ts` | Add SPPG option |
| `src/schemas/User.ts` | Add SPPG to validation (if needed) |
| `src/app/api/admin/marketing/referral-settings/route.ts` | **New** - CRUD for per-referral settings |
| `src/app/api/referral/validate/route.ts` | **New** - Validate & get discount info |
| `src/lib/payment-processor.ts` | Update commission calculation |
| `src/lib/commission.ts` | Update commission calculation |
| `src/app/api/payment/webhook/route.ts` | Handle SPPG split |
| `src/app/marketing/page.tsx` | Add commission settings UI |
| `src/components/landing/PlantShowcaseSection.tsx` | Add discount display |
| `src/components/landing/CicilanModal.tsx` | Add discount display |
| `src/app/api/contract/create/route.ts` | Store discount info |

---

## Oracle Review Findings (Metis & Momus)

### Architecture Decision: User Model vs Separate Collection

**Verdict**: User model approach is **acceptable** with required mitigations.

| Concern | Risk Level | Mitigation Required |
|---------|------------|---------------------|
| Schema pollution (unused fields on non-marketing users) | Low | Acceptable tradeoff for simplicity |
| Audit trail for rate changes | **HIGH** | **MUST add audit logging** - who/when/old→new values |
| Query performance | Low | Single document fetch is optimal |
| Separation of concerns | Medium | Document clearly that commission fields are marketing-only |

**Escalation Triggers** (consider separate `ReferralSettings` model if):
- Formal audit trails required for compliance/disputes
- Frequent rate changes needing historical reports
- Multiple commission policies beyond marketing staff

### Math Verification: Commission Split Formula

**Verdict**: Math is **CORRECT** if rates apply to **original (list) price**.

```
Example: Rp 1,000,000 product, 30% commission, 20% company cut

✅ CORRECT INTERPRETATION:
- Customer pays: Rp 700,000 (after 30% SPPG discount)
- Company cut: Rp 200,000 (20% of original price)
- Marketing commission: Rp 100,000 (10% of original price)
- Company retains: Rp 600,000 (Rp 700,000 - Rp 100,000 payout)

⚠️ CLARIFY WITH PRODUCT OWNER:
- Is company cut based on ORIGINAL price or NET (discounted) price?
- Current assumption: ORIGINAL price basis
```

### Security Concerns: SPPG Discount Flow

**Critical vulnerabilities to address:**

| Attack Vector | Risk | Mitigation |
|---------------|------|------------|
| Fake occupation manipulation | HIGH | **Backend recalculates discount** - NEVER trust frontend amounts |
| Tampering with discount metadata | HIGH | Backend fetches user occupation from session/DB, not from request |
| Race condition: rate changes between validation and payment | Medium | Lock rate at contract creation time |
| Replay attacks | Medium | Use idempotency keys, validate payment amounts match contract |

**MANDATORY SECURITY RULE**:
```
Backend MUST:
1. Re-fetch user occupation from database (not from request)
2. Re-fetch marketing staff's commission rate at payment time
3. Recalculate discount amount server-side
4. Store locked rates on Contract/Payment for audit
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing commission records incompatible | Medium | Migration script to set defaults |
| SPPG users game the system | Low | Verify occupation during KYC |
| Commission calculation errors | High | Unit tests, transaction logging |
| Head marketing sets invalid rates | Low | Validation (0-100%, companyCut < commission) |
| **No audit trail for rate changes** | **High** | **Add CommissionRateAudit logging** |
| **Frontend discount manipulation** | **Critical** | **Backend recalculates all amounts** |
| **Race condition on rate changes** | Medium | Lock rates at contract creation |

---

## Testing Requirements

1. **Unit Tests**: Commission calculation with various scenarios
2. **Integration Tests**: Full checkout flow for SPPG vs non-SPPG
3. **Security Tests**:
   - Attempt to send fake occupation in request (should be ignored)
   - Attempt to send fake discount amounts (should be recalculated)
   - Verify rate changes after contract creation don't affect existing contracts
4. **Manual Tests**: 
   - Head marketing setting commission rates
   - SPPG user checkout with discount preview
   - Commission history accuracy
   - Audit log for rate changes

---

## Questions for Product Owner

~~1. What happens if SPPG user doesn't enter referral code? (No discount? Block checkout?)~~  
**ANSWERED**: No discount, normal flow like non-SPPG users

~~2. Should existing marketing staff get a default `customCommissionRate`?~~  
**ANSWERED**: Yes, all marketing staff AND marketing_head get default rate

~~3. Is there a minimum commission rate for marketing staff?~~  
**ANSWERED**: No minimum (can be 0%)

~~4. Should the discount be visible before entering referral code (for SPPG users)?~~  
**ANSWERED**: No, only shown after referral code validated, on the modal itself

~~5. How to handle edge case: referral code owner is deactivated?~~  
**ANSWERED**: Validation fails - user sees error message

---

## Next Steps

1. ~~Clarify open questions with product owner~~ ✅ DONE
2. ~~Oracle review (Metis & Momus)~~ ✅ DONE
3. ~~Approve this plan~~ ✅ READY
4. ~~Confirm with Product Owner~~: Company cut based on **ORIGINAL price** ✅ CONFIRMED
5. ~~**Phase 1 first**: Database changes (backward compatible)~~ ✅ DONE
6. ~~**Phase 2-5**: Implement in order, test each phase~~ ✅ DONE

## Remaining Tasks

- [ ] 5.3 Update invoice/receipt generation to show discount details (low priority)
- [ ] Run migration script `scripts/migrate-marketing-commission.ts` on production
- [ ] Manual testing of all flows
- [ ] Commit changes

---

*Plan created by analyzing codebase. Oracle review completed. Implementation completed 2026-01-25.*
