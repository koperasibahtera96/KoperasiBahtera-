# SPPG/TNI Discount & Commission Flow Documentation

## Overview

This document explains the complete flow and validation rules for the SPPG (Serikat Pekerja Perkebunan Gaharu) and TNI (Tentara Nasional Indonesia) member discount system, including referral code validation, discount application, and commission calculation.

---

## Table of Contents

1. [Eligible Occupations](#eligible-occupations)
2. [Referral Code Validation Flow](#referral-code-validation-flow)
3. [Contract Creation Flow](#contract-creation-flow)
4. [Discount Application Rules](#discount-application-rules)
5. [Payment Processing Flow](#payment-processing-flow)
6. [Commission Calculation Flow](#commission-calculation-flow)
7. [Data Models & Fields](#data-models--fields)
8. [Validation Rules Summary](#validation-rules-summary)

---

## Eligible Occupations

### Discount-Eligible Occupations

The following occupations are eligible for member discounts:

- **SPPG** (`sppg`) - Serikat Pekerja Perkebunan Gaharu
- **TNI** (`tni`) - Tentara Nasional Indonesia

**Code Reference:**
```typescript
const discountEligibleOccupations = ["sppg", "tni"];
```

---

## Referral Code Validation Flow

### Endpoint: `POST /api/referral/validate`

This endpoint validates referral codes and determines if the requesting user is eligible for a discount.

### Step-by-Step Flow

1. **Input Validation**
   - Referral code must be provided (non-empty)
   - Format validation: Must be exactly 6 uppercase alphanumeric characters (`/^[A-Z0-9]{6}$/`)

2. **Marketing Staff Lookup**
   - Query: Find user with matching `referralCode`
   - Role filter: Must be `"marketing"` or `"marketing_head"`
   - **Validation Rule**: Marketing staff must exist

3. **Active Status Check**
   - **Validation Rule**: `marketingUser.isActive === true`
   - If inactive: Returns error "Kode referral tidak aktif"

4. **Commission Rate Determination**
   - Priority order:
     1. `marketingUser.customCommissionRate` (if set)
     2. Global rate from `Settings.config.commissionRate` (default: 0.02 = 2%)

5. **Discount Eligibility Check**
   - **Validation Rules**:
     - User must be authenticated (session exists)
     - User's `occupation` must be in `["sppg", "tni"]`
     - Commission rate must be defined and > 0
   - If eligible: Returns `discountInfo` with:
     - `isSppgUser: true`
     - `discountPercentage: commissionRate`
     - `discountLabel: "${Math.round(commissionRate * 100)}%"`

### Response Format

**Success (with discount):**
```json
{
  "success": true,
  "message": "Kode referral valid",
  "marketingStaffName": "John Doe",
  "discountInfo": {
    "isSppgUser": true,
    "discountPercentage": 0.30,
    "discountLabel": "30%"
  }
}
```

**Success (no discount):**
```json
{
  "success": true,
  "message": "Kode referral valid",
  "marketingStaffName": "John Doe"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Kode referral tidak aktif"
}
```

---

## Contract Creation Flow

### Endpoint: `POST /api/contract/create`

This endpoint creates a contract and applies discounts for eligible users.

### Step-by-Step Flow

1. **User Authentication**
   - **Validation Rule**: User must be authenticated
   - **Validation Rule**: User must exist in database

2. **Referral Code Validation** (if provided)
   - **Format Validation**:
     - Type: `string`
     - Length: Exactly 6 characters
     - Pattern: `/^[A-Z0-9]{6}$/` (uppercase alphanumeric)
   - **Existence Validation**:
     - Marketing staff with matching `referralCode` must exist
     - Role: Must be `"marketing"` or `"marketing_head"`
     - **Validation Rule**: `isActive === true`

3. **Commission Rate Locking**
   - Determines `lockedCommissionRate`:
     - Priority 1: `marketingUser.customCommissionRate`
     - Priority 2: Global `Settings.config.commissionRate` (default: 0.02)
   - Determines `lockedCompanyCutRate`:
     - From `marketingUser.companyCutRate` (if set)

4. **Discount Eligibility Check**
   - **Validation Rules** (ALL must be true):
     1. User's `occupation` is in `["sppg", "tni"]`
     2. `lockedCommissionRate` is defined (`!== undefined`)
     3. `lockedCommissionRate > 0`
   - If eligible:
     - `isSppgDiscount = true`
     - `discountPercentage = lockedCommissionRate`
     - `discountAmount = Math.round(originalAmount * discountPercentage)`
     - `finalAmount = originalAmount - discountAmount`

5. **Contract Creation**
   - Stores locked rates: `lockedCommissionRate`, `lockedCompanyCutRate`
   - Stores discount info (if applicable):
     - `originalAmount`
     - `discountPercentage`
     - `discountAmount`
     - `isSppgDiscount: true`
   - **Important**: Contract `totalAmount` = `finalAmount` (discounted price)

6. **Payment URL Generation** (for full payments)
   - Midtrans item details include discount as separate line item:
     ```json
     [
       {
         "id": "productId",
         "price": originalAmount,
         "quantity": 1,
         "name": "Product Name"
       },
       {
         "id": "MEMBER_DISCOUNT",
         "price": -discountAmount,
         "quantity": 1,
         "name": "Diskon Anggota (XX%)"
       }
     ]
     ```
   - Midtrans transaction amount = `finalAmount` (discounted)

---

## Discount Application Rules

### When Discount is Applied

A discount is applied when **ALL** of the following conditions are met:

1. ✅ Referral code is provided and valid
2. ✅ Referral code belongs to an active marketing staff
3. ✅ User's occupation is `"sppg"` or `"tni"`
4. ✅ Commission rate is defined and > 0

### Discount Calculation

```
originalAmount = totalAmount (from request)
discountPercentage = lockedCommissionRate
discountAmount = Math.round(originalAmount × discountPercentage)
finalAmount = originalAmount - discountAmount
```

### Example

**Input:**
- Original price: Rp 35,000,000
- Commission rate: 50% (0.50)
- User occupation: "sppg"

**Calculation:**
- `discountPercentage = 0.50`
- `discountAmount = 35,000,000 × 0.50 = 17,500,000`
- `finalAmount = 35,000,000 - 17,500,000 = 17,500,000`

**Result:**
- Customer pays: **Rp 17,500,000**
- Discount: **Rp 17,500,000 (50%)**

---

## Payment Processing Flow

### Payment Record Creation

When a payment is created (full-investment or first installment), the following SPPG discount fields are copied from the contract:

```typescript
{
  isSppgDiscount: contract.isSppgDiscount,
  originalAmount: contract.originalAmount,
  discountPercentage: contract.discountPercentage,
  discountAmount: contract.discountAmount
}
```

**Critical**: These fields must be present on the payment record for correct commission calculation.

### Payment Processing Endpoints

1. **Midtrans Webhook** (`POST /api/payment/webhook`)
   - Processes settlement/capture notifications
   - Creates commission records

2. **Manual Payment Processor** (`src/lib/payment-processor.ts`)
   - Processes manual bank transfers (BCA, etc.)
   - Creates commission records

Both paths use the same commission calculation logic.

---

## Commission Calculation Flow

### Commission Rate Priority

When calculating commissions, rates are determined in this priority order:

1. **Contract Locked Rate** (highest priority)
   - `contract.lockedCommissionRate`
   - `contract.lockedCompanyCutRate`
   - **Source**: Locked at contract creation time

2. **Marketing Staff Custom Rate**
   - `marketingStaff.customCommissionRate`
   - `marketingStaff.companyCutRate`
   - **Source**: Current value on marketing staff record

3. **Global Default Rate** (fallback)
   - `Settings.config.commissionRate` (default: 0.02 = 2%)
   - **Source**: System-wide default

### Contract Value Determination

**For SPPG/TNI Transactions:**
```typescript
contractValue = payment.originalAmount  // Use ORIGINAL price (before discount)
```

**For Regular Transactions:**
```typescript
contractValue = payment.amount  // Use actual payment amount
```

**Critical Rule**: Commission is **always** calculated on the **original price** for SPPG/TNI transactions, not the discounted price.

### Commission Split Logic

#### SPPG/TNI Transaction (with company cut)

**Conditions:**
- `payment.isSppgDiscount === true`
- `companyCutRate !== undefined`

**Calculation:**
```typescript
marketingCommissionRate = commissionRate - companyCutRate
marketingCommission = Math.round(contractValue × marketingCommissionRate)
companyCut = Math.round(contractValue × companyCutRate)
```

**Example:**
- Original price: Rp 35,000,000
- Commission rate: 50% (0.50)
- Company cut rate: 40% (0.40)
- Marketing rate: 50% - 40% = 10% (0.10)

**Result:**
- Marketing commission: 35,000,000 × 0.10 = **Rp 3,500,000**
- Company cut: 35,000,000 × 0.40 = **Rp 14,000,000**
- Total commission pool: **Rp 17,500,000**

#### Regular Transaction (no company cut)

**Conditions:**
- `payment.isSppgDiscount !== true` OR `companyCutRate === undefined`

**Calculation:**
```typescript
marketingCommission = Math.round(contractValue × commissionRate)
```

**Example:**
- Contract value: Rp 35,000,000
- Commission rate: 30% (0.30)

**Result:**
- Marketing commission: 35,000,000 × 0.30 = **Rp 10,500,000**

### Installment Payments

For installment payments, the same logic applies, but:

1. **Original amount** is stored per-installment (prorated from total)
2. **Commission calculation** uses the full original contract value
3. **Commission distribution** follows `minConsecutiveTenor` rules for monthly payments

---

## Data Models & Fields

### Contract Model

```typescript
interface IContract {
  // ... other fields
  
  // Locked commission rates
  lockedCommissionRate?: number;      // 0.00-1.00, locked at creation
  lockedCompanyCutRate?: number;      // 0.00-1.00, locked at creation
  
  // SPPG discount fields
  originalAmount?: number;            // Original price before discount
  discountPercentage?: number;        // Discount rate (0.00-1.00)
  discountAmount?: number;            // Absolute discount amount
  isSppgDiscount?: boolean;          // Flag indicating discount applied
  
  // Referral
  referralCode?: string;              // 6-char alphanumeric code
  
  // Amounts
  totalAmount: number;                // Final amount (after discount if applicable)
}
```

### Payment Model

```typescript
interface IPayment {
  // ... other fields
  
  // Referral
  referralCode?: string;              // Copied from contract
  
  // SPPG discount fields (copied from contract)
  originalAmount?: number;            // Original price before discount
  discountPercentage?: number;        // Discount rate (0.00-1.00)
  discountAmount?: number;            // Absolute discount amount
  isSppgDiscount?: boolean;          // Flag indicating discount applied
  
  // Amounts
  amount: number;                     // Payment amount (discounted if SPPG)
}
```

### CommissionHistory Model

```typescript
interface ICommissionHistory {
  // ... other fields
  
  // Commission calculation
  contractValue: number;               // Base for commission (original for SPPG)
  commissionRate: number;              // Rate used (0.00-1.00)
  commissionAmount: number;            // Marketing staff commission
  
  // SPPG-specific fields
  companyCutRate?: number;            // Company cut rate (0.00-1.00)
  companyCutAmount?: number;          // Company cut amount
  isSppgTransaction?: boolean;        // Flag indicating SPPG transaction
}
```

---

## Validation Rules Summary

### Referral Code Validation

| Rule | Condition | Error Message |
|------|-----------|---------------|
| **Format** | Must be exactly 6 uppercase alphanumeric characters | "Format kode referral tidak valid" |
| **Existence** | Must belong to a marketing staff or marketing_head | "Kode referral tidak valid atau tidak ditemukan" |
| **Active Status** | Marketing staff must be active (`isActive === true`) | "Kode referral tidak aktif" |

### Discount Eligibility

| Rule | Condition | Result |
|------|-----------|--------|
| **Occupation** | User's `occupation` must be `"sppg"` or `"tni"` | Discount applied if all other conditions met |
| **Commission Rate** | `lockedCommissionRate` must be defined and > 0 | Discount applied if occupation eligible |
| **Referral Code** | Valid referral code must be provided | No discount if no referral code |

### Commission Calculation

| Rule | Condition | Behavior |
|------|-----------|----------|
| **Contract Value (SPPG)** | `isSppgDiscount === true` | Use `payment.originalAmount` |
| **Contract Value (Regular)** | `isSppgDiscount !== true` | Use `payment.amount` |
| **Rate Priority** | Contract locked rate exists | Use locked rate |
| **Rate Priority** | No locked rate, custom rate exists | Use custom rate |
| **Rate Priority** | No locked/custom rate | Use global default (2%) |
| **Commission Split** | SPPG + company cut defined | Split: marketing gets (rate - cut), company gets cut |
| **Commission Split** | Regular or no company cut | Marketing gets full commission |

---

## Flow Diagrams

### Complete Flow: Contract Creation to Commission

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Enters Referral Code                                │
│    - Frontend validates format (6 uppercase alphanumeric)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. API: POST /api/referral/validate                         │
│    - Validates referral code format                         │
│    - Checks marketing staff exists & active                 │
│    - Gets commission rate (custom or global)                │
│    - Checks user occupation (sppg/tni)                      │
│    - Returns discount info if eligible                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. User Creates Contract                                    │
│    - POST /api/contract/create                              │
│    - Validates referral code again                         │
│    - Locks commission rates                                 │
│    - Applies discount if eligible                           │
│    - Stores: originalAmount, discountAmount, finalAmount   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Payment Record Created                                   │
│    - Copies SPPG fields from contract                       │
│    - Stores: isSppgDiscount, originalAmount, etc.          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Payment Processed (Webhook/Manual)                       │
│    - Retrieves locked rates from contract                   │
│    - Determines contract value (original for SPPG)         │
│    - Calculates commission split                            │
│    - Creates CommissionHistory record                       │
└─────────────────────────────────────────────────────────────┘
```

### Discount Eligibility Decision Tree

```
                    ┌─────────────────┐
                    │ Referral Code?  │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                   NO                YES
                    │                 │
                    ▼                 ▼
            ┌───────────────┐  ┌──────────────────┐
            │ No Discount   │  │ Valid & Active?   │
            └───────────────┘  └────────┬─────────┘
                                        │
                               ┌────────┴────────┐
                               │                 │
                              NO                YES
                               │                 │
                               ▼                 ▼
                       ┌───────────────┐  ┌──────────────────┐
                       │ No Discount   │  │ Occupation?      │
                       └───────────────┘  └────────┬─────────┘
                                                   │
                                          ┌────────┴────────┐
                                          │                 │
                                    NOT SPPG/TNI        SPPG/TNI
                                          │                 │
                                          ▼                 ▼
                                 ┌───────────────┐  ┌──────────────────┐
                                 │ No Discount   │  │ Rate > 0?        │
                                 └───────────────┘  └────────┬─────────┘
                                                             │
                                                    ┌────────┴────────┐
                                                    │                 │
                                                   NO                YES
                                                    │                 │
                                                    ▼                 ▼
                                           ┌───────────────┐  ┌──────────────────┐
                                           │ No Discount   │  │ ✅ APPLY DISCOUNT │
                                           └───────────────┘  └──────────────────┘
```

---

## Important Notes

### ⚠️ Critical Rules

1. **Commission is ALWAYS calculated on ORIGINAL price for SPPG/TNI transactions**
   - Never use the discounted amount for commission calculation
   - Always check `payment.isSppgDiscount` and use `payment.originalAmount`

2. **Rates are LOCKED at contract creation**
   - Prevents race conditions if marketing staff rates change
   - Always prefer `contract.lockedCommissionRate` over current rates

3. **SPPG discount fields must be copied to Payment records**
   - Required for correct commission calculation in webhook/processor
   - Missing fields = incorrect commission calculation

4. **Discount requires ALL conditions**
   - Valid referral code
   - Active marketing staff
   - Eligible occupation (sppg/tni)
   - Commission rate > 0

### 🔍 Debugging Tips

1. **Check contract fields:**
   ```typescript
   contract.isSppgDiscount === true
   contract.originalAmount > contract.totalAmount
   contract.lockedCommissionRate !== undefined
   ```

2. **Check payment fields:**
   ```typescript
   payment.isSppgDiscount === true
   payment.originalAmount !== undefined
   payment.amount < payment.originalAmount  // If discount applied
   ```

3. **Check commission calculation:**
   ```typescript
   // Should use originalAmount for SPPG
   contractValue = isSppgTransaction ? payment.originalAmount : payment.amount
   
   // Should split if company cut exists
   if (isSppgTransaction && companyCutRate) {
     marketingRate = commissionRate - companyCutRate
   }
   ```

---

## Examples

### Example 1: SPPG User with 50% Commission Rate

**Input:**
- User occupation: `"sppg"`
- Original price: Rp 35,000,000
- Referral code: `"ABC123"` (marketing staff with 50% commission, 40% company cut)

**Contract Creation:**
- `lockedCommissionRate = 0.50`
- `lockedCompanyCutRate = 0.40`
- `discountPercentage = 0.50`
- `discountAmount = 17,500,000`
- `finalAmount = 17,500,000`
- `isSppgDiscount = true`

**Payment:**
- Customer pays: Rp 17,500,000

**Commission Calculation:**
- `contractValue = 35,000,000` (original)
- `marketingCommissionRate = 0.50 - 0.40 = 0.10`
- `marketingCommission = 35,000,000 × 0.10 = 3,500,000`
- `companyCut = 35,000,000 × 0.40 = 14,000,000`

### Example 2: Regular User with 30% Commission Rate

**Input:**
- User occupation: `"pegawai_swasta"` (not sppg/tni)
- Original price: Rp 35,000,000
- Referral code: `"XYZ789"` (marketing staff with 30% commission)

**Contract Creation:**
- `lockedCommissionRate = 0.30`
- `lockedCompanyCutRate = undefined`
- `isSppgDiscount = false`
- `finalAmount = 35,000,000` (no discount)

**Payment:**
- Customer pays: Rp 35,000,000

**Commission Calculation:**
- `contractValue = 35,000,000`
- `marketingCommission = 35,000,000 × 0.30 = 10,500,000`
- No company cut

---

## API Endpoints Reference

### POST /api/referral/validate

**Purpose:** Validate referral code and check discount eligibility

**Request:**
```json
{
  "referralCode": "ABC123"
}
```

**Response (with discount):**
```json
{
  "success": true,
  "message": "Kode referral valid",
  "marketingStaffName": "John Doe",
  "discountInfo": {
    "isSppgUser": true,
    "discountPercentage": 0.30,
    "discountLabel": "30%"
  }
}
```

### POST /api/contract/create

**Purpose:** Create contract with discount application

**Request:**
```json
{
  "productName": "Paket 10 Pohon Aren",
  "productId": "paket-10",
  "totalAmount": 35000000,
  "paymentType": "full",
  "referralCode": "ABC123"
}
```

**Response (with discount):**
```json
{
  "success": true,
  "data": {
    "contractId": "INV-BMS-...",
    "totalAmount": 17500000,
    "discountApplied": {
      "originalAmount": 35000000,
      "discountPercentage": 0.50,
      "discountAmount": 17500000,
      "finalAmount": 17500000
    }
  }
}
```

---

## Version History

- **2026-01-25**: Initial documentation
  - Added SPPG discount support
  - Added TNI discount support
  - Documented complete flow and validation rules

---

## Related Files

- `/src/app/api/referral/validate/route.ts` - Referral validation endpoint
- `/src/app/api/contract/create/route.ts` - Contract creation with discount
- `/src/app/api/payment/webhook/route.ts` - Payment webhook handler
- `/src/lib/payment-processor.ts` - Manual payment processor
- `/src/lib/commission.ts` - Commission calculation utility
- `/src/models/Contract.ts` - Contract model
- `/src/models/Payment.ts` - Payment model
- `/src/models/CommissionHistory.ts` - Commission history model
