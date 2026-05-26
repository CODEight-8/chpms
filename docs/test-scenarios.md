# CHPMS — Test Scenarios

End-to-end coverage of the Coconut Husk Processing Management System.
Every scenario has a stable ID so it can be referenced from bug reports,
PR descriptions, and CI pipelines.

> **Conventions**
> - **Type:** **U**nit (pure logic, no DB) · **I**ntegration (API + DB) · **E**2E (browser flow)
> - **Severity:** **C**ritical (blocker) · **H**igh · **M**edium · **L**ow
> - **Pre:** Preconditions / fixtures needed
> - **Steps → Expected:** Test action and pass criteria
> - Each row maps to one assertion (or a small group)

## Table of Contents
1. [Authentication & Authorization](#1-authentication--authorization)
2. [Permissions Matrix](#2-permissions-matrix)
3. [Suppliers](#3-suppliers)
4. [Supplier Lots](#4-supplier-lots)
5. [Production Batches](#5-production-batches)
6. [Order Fulfillment](#6-order-fulfillment)
7. [Clients](#7-clients)
8. [Orders](#8-orders)
9. [Supplier Payments (Money Out)](#9-supplier-payments-money-out)
10. [Client Payments (Money In)](#10-client-payments-money-in)
11. [Miscellaneous Transactions](#11-miscellaneous-transactions)
12. [Production Batch Additional Cost](#12-production-batch-additional-cost)
13. [Accounts Page](#13-accounts-page)
14. [Dashboard](#14-dashboard)
15. [Concurrency / Race Conditions](#15-concurrency--race-conditions)
16. [Data Migrations & Backfills](#16-data-migrations--backfills)
17. [Validation & Input Hardening](#17-validation--input-hardening)
18. [Security](#18-security)
19. [UI / UX](#19-ui--ux)
20. [Printable Documents](#20-printable-documents)
21. [Reports & CSV Exports](#21-reports--csv-exports)
22. [Coverage Matrix](#22-coverage-matrix)

---

## 1. Authentication & Authorization

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| AUTH-001 | C | I | seeded owner | POST /api/auth/callback/credentials with valid email+password → 200, session cookie set, redirect to /dashboard |
| AUTH-002 | C | I | seeded owner | Same with wrong password → 401 / login form with error |
| AUTH-003 | H | I | inactive user | Sign in with deactivated account → rejected (`!user.isActive` short-circuit) |
| AUTH-004 | H | U | n/a | `bcrypt.compare` invoked with correct password hash returns true; with wrong returns false |
| AUTH-005 | C | E2E | logged in via `localhost:3000` | Click Sign Out → lands on `localhost:3000/login` |
| AUTH-006 | C | E2E | logged in via `chpms-host:3000` (Tailscale) | Click Sign Out → lands on `chpms-host:3000/login` (NOT localhost) — this validates the Phase-1 sign-out fix |
| AUTH-007 | H | U | n/a | NextAuth `redirect({ url:"/foo", baseUrl })` callback returns `"/foo"` (relative pass-through) |
| AUTH-008 | H | U | n/a | NextAuth `redirect({ url:"https://evil.com", baseUrl:"http://localhost:3000" })` returns `baseUrl` (origin mismatch) |
| AUTH-009 | M | U | n/a | NextAuth `redirect` with malformed URL → falls through try/catch to baseUrl |
| AUTH-010 | M | I | JWT session active | Reload page after 24h+1min → session expired, redirect to /login |
| AUTH-011 | L | I | logged-in OWNER session | `GET /api/health` returns `{ status:"ok", db:"connected" }` regardless of auth |

## 2. Permissions Matrix

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| PERM-001 | C | U | n/a | `hasPermission("OWNER", "suppliers", "delete")` === true |
| PERM-002 | C | U | n/a | `hasPermission("PRODUCTION", "suppliers", "edit")` === false |
| PERM-003 | C | U | n/a | `hasPermission("MANAGER", "accounts", "view")` === false (accounts is OWNER-only) |
| PERM-004 | C | I | logged-in PRODUCTION | DELETE /api/supplier-lots/{id} → 403 |
| PERM-005 | C | I | logged-in MANAGER | POST /api/payments/supplier → 403 (accounts:create is OWNER-only) |
| PERM-006 | C | I | logged-in OWNER | POST /api/misc-transactions → 201 |
| PERM-007 | H | I | logged-in MANAGER | GET /api/system/payment-audit → 403 (accounts:view OWNER-only) |
| PERM-008 | H | I | unauthenticated | GET /api/orders → 401 |
| PERM-009 | H | I | logged-in MANAGER | PATCH /api/supplier-lots/{id}/status → 200 (supplier-lots:edit grants OWNER + MANAGER) |
| PERM-010 | M | E2E | PRODUCTION user | Sidebar shows only Production, Supplier Lots (view), Dashboard tabs — no Accounts, no Clients, no Users |

## 3. Suppliers

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| SUP-001 | C | I | OWNER session | POST /api/suppliers with valid SL phone "+94771234567" → 201, normalized as `+94771234567` |
| SUP-002 | C | I | OWNER session | POST with phone "0771234567" → 201, normalized as `+94771234567` |
| SUP-003 | C | I | OWNER session | POST with phone "94771234567" → 201, normalized as `+94771234567` |
| SUP-004 | C | I | OWNER session | POST with non-SL phone "+12025550100" → 400 validation error |
| SUP-005 | H | I | existing supplier "Bimsara" | POST with same name (case-insensitive) → 409 conflict |
| SUP-006 | H | I | active supplier with lots | PUT /api/suppliers/{id} changing name → 400 "name cannot be changed" |
| SUP-007 | H | I | OWNER session | PUT changing only phone → phone re-normalized; other fields preserved |
| SUP-008 | M | I | OWNER session | Soft-delete supplier (set isActive=false) — existing lots/payments remain visible |
| SUP-009 | M | I | inactive supplier | POST new lot for them → 400 (validate active state at creation) |
| SUP-010 | L | E2E | OWNER session | Suppliers list shows active first, then inactive (sort: isActive desc, name asc) |
| SUP-011 | L | U | n/a | `normalizeSriLankaPhoneNumber("")` returns undefined |
| SUP-012 | L | U | n/a | `formatSriLankaPhoneNumber(null)` returns "" |

## 4. Supplier Lots

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| LOT-001 | C | I | active supplier | POST /api/supplier-lots — auto-generates `lotNumber` (SL-YYYYMMDD-NNN) and `invoiceNumber` (INV-{lotNumber}) |
| LOT-002 | C | U | n/a | `totalCost === huskCount * perHuskRate` exact arithmetic |
| LOT-003 | C | I | new lot | Status defaults to `AUDIT`; `availableHusks === huskCount`; `qualityGrade` null |
| LOT-004 | C | I | AUDIT lot, grade A | PATCH status to APPROVED → 200, status flips |
| LOT-005 | C | I | AUDIT lot, no grade | PATCH status to APPROVED → 400 "quality grade must be A, B, or C" |
| LOT-006 | C | I | AUDIT lot, grade REJECT | PATCH status to APPROVED → 400 (REJECT not approvable) |
| LOT-007 | C | I | APPROVED lot | PATCH status to GOOD_TO_GO → 200 |
| LOT-008 | C | I | AUDIT lot | PATCH status directly to GOOD_TO_GO → 400 invalid transition (must go via APPROVED) |
| LOT-009 | C | I | APPROVED lot | PATCH to REJECTED → 200 (can reject at APPROVED stage too) |
| LOT-010 | C | I | GOOD_TO_GO lot consumed by batch | Status auto-transitions to ALLOCATED when husks decremented but > 0; CONSUMED when husks hit 0 |
| LOT-011 | H | I | CONSUMED lot | PATCH status to anything → 400 (terminal state) |
| LOT-012 | H | I | OWNER, lot with no batch + no payments | DELETE → 200 |
| LOT-013 | H | I | lot used in batch | DELETE → 400 "already used in production" |
| LOT-014 | H | I | lot with payment allocations | DELETE → 400 "supplier payments are linked" |
| LOT-015 | M | E2E | supplier-lots page | Tabs: All / Audit / Approved / Good to Go / Allocated / Consumed / Rejected — each filters correctly |
| LOT-016 | M | U | n/a | `calculateBatchAging` returns whole days between harvestDate and today |
| LOT-017 | L | I | OWNER | GET /api/supplier-lots?status=INVALID → 400 "Invalid status" |

## 5. Production Batches

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| BATCH-001 | C | I | 2 GOOD_TO_GO lots | POST /api/production-batches with both lots → 201, batchNumber `PB-YYYYMMDD-NNN`, totalRawCost = sum |
| BATCH-002 | C | I | AUDIT lot | POST batch using it → 400 "not available (status: AUDIT)" |
| BATCH-003 | C | I | APPROVED lot | POST batch using it → 400 (APPROVED is gate before GOOD_TO_GO, not usable yet) |
| BATCH-004 | C | I | GOOD_TO_GO lot, 100 husks available | POST batch using 150 → 400 "only has 100 husks available" |
| BATCH-005 | C | I | new batch | Status defaults to `IN_PROGRESS`; `outputQuantity` null; `availableOutput` null |
| BATCH-006 | C | I | IN_PROGRESS batch | PATCH /api/production-batches/{id}/complete with outputQuantity=500, qualityScore=80 → status COMPLETED, qualityGrade GOOD, availableOutput=500 |
| BATCH-007 | C | I | IN_PROGRESS batch | Complete with outputQuantity > sum(batchLots.quantityUsed) → 400 |
| BATCH-008 | C | U | n/a | `calculateQualityGrade(75)` === "GOOD"; `(50)` === "AVERAGE"; `(49)` === "REJECT" |
| BATCH-009 | C | I | COMPLETED batch | PATCH /complete again → 400 "only in-progress batches can be completed" |
| BATCH-010 | H | I | batch completion succeeds | `availableOutput` initialized to `outputQuantity` |
| BATCH-011 | H | I | OWNER | GET /api/production-batches?status=DISPATCHED → 400 (enum removed) |
| BATCH-012 | M | I | inactive product | POST batch for it → 400 |
| BATCH-013 | M | E2E | production list | Cards: In Progress count, Completed count, Total Output, Available Output |

## 6. Order Fulfillment

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| FULFILL-001 | C | I | CONFIRMED order, COMPLETED batch | POST /api/orders/{id}/fulfill — fulfillment row created, `orderItem.quantityFulfilled` += amount, `batch.availableOutput` -= amount |
| FULFILL-002 | C | I | batch with availableOutput=100 | Fulfill 150 → 400 "only has 100 available" |
| FULFILL-003 | C | I | item ordered 100, already 80 fulfilled | Fulfill 30 → 400 "would exceed remaining quantity" |
| FULFILL-004 | C | I | order item chipSize=5mm, batch chipSize=10mm | Fulfill → 400 "chip size mismatch" |
| FULFILL-005 | C | I | item product A, batch product B | Fulfill → 400 "different product" |
| FULFILL-006 | C | I | IN_PROGRESS batch | Fulfill → 400 "must be completed" |
| FULFILL-007 | C | I | CANCELLED order | Fulfill → 400 "must be confirmed before fulfillment" |
| FULFILL-008 | C | I | all items fully fulfilled by this fulfill request | Order status auto-flips to FULFILLED |
| FULFILL-009 | C | I | one fulfill request with 2 items in same payload, both for same order item | Second one rejected via updateMany predicate if it would push quantityFulfilled past quantityOrdered |
| FULFILL-010 | M | E2E | fulfill dialog | Cost-per-kg chip displays `totalRawCost / outputQuantity` per batch |
| FULFILL-011 | M | E2E | fulfill dialog | Selected-batches summary shows total allocated cost (proportional) |
| FULFILL-012 | M | I | division-by-zero edge case | Batch with outputQuantity=0 → cost calc skips (no Infinity) |

## 7. Clients

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| CLI-001 | C | I | OWNER | POST /api/clients with all required fields → 201, phone normalized |
| CLI-002 | C | I | OWNER | POST with payment terms unset → defaults to "Due on Receipt" |
| CLI-003 | C | I | existing client "Kaveesha" | POST with same name → 409 |
| CLI-004 | H | I | existing client | PUT changing name → 400 (immutable) |
| CLI-005 | H | I | active client | Soft-delete (isActive=false) — orders/payments visible read-only |
| CLI-006 | H | I | inactive client | POST new payment → 400 "inactive client" |
| CLI-007 | M | E2E | client form | Phone displays formatted via `formatSriLankaPhoneNumber` |

## 8. Orders

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| ORD-001 | C | I | active client | POST /api/orders → 201; orderNumber `ORD-YYYYMMDD-NNN`; invoiceNumber `INV-{orderNumber}` |
| ORD-002 | C | I | new order | Status defaults to CONFIRMED |
| ORD-003 | C | I | CONFIRMED order, partial fulfillment | StatusBadge displays "PARTIALLY_FULFILLED" badge in UI (computed, not stored) |
| ORD-004 | C | I | CONFIRMED with all items fulfilled | Status auto-flips to FULFILLED |
| ORD-005 | H | I | FULFILLED | PATCH status → DISPATCHED → 200 |
| ORD-006 | H | I | DISPATCHED | PATCH to anything → 400 (terminal) |
| ORD-007 | H | I | CANCELLED order | Cannot accept payment (CLI-PAY-008) or fulfillment |
| ORD-008 | M | E2E | order detail | Production Cost card shows `totalRawCost / outputQuantity * quantityFulfilled` summed across fulfillments |
| ORD-009 | M | E2E | order detail | Payment History list shows one row per allocation (not per payment) |
| ORD-010 | L | I | order delete | Cascade deletes order items, fulfillments, allocations correctly |

## 9. Supplier Payments (Money Out)

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| SUP-PAY-001 | C | I | active supplier, 1 lot | POST /api/payments/supplier with `supplierLotId` (legacy form) → 201; auto-wraps as 1-row allocation |
| SUP-PAY-002 | C | I | 3 outstanding lots | POST with `allocations: [{lotId1, 50k}, {lotId2, 30k}, {lotId3, 20k}]`, amount=100k → 201; 3 allocation rows; receipt # generated |
| SUP-PAY-003 | C | I | (002 above) | Allocations sum ≠ amount → 400 "Allocation total must equal payment amount" |
| SUP-PAY-004 | C | I | no allocations + no lotId | POST → 400 "At least one lot allocation is required" |
| SUP-PAY-005 | C | I | same lotId twice in allocations array | POST → 400 "Same lot allocated twice" |
| SUP-PAY-006 | C | I | lot from different supplier | POST allocation against it → 400 "does not belong to specified supplier" |
| SUP-PAY-007 | C | I | lot total 100k, already paid 80k | POST allocation of 25k → 400 "Overpayment blocked. Lot total 100,000..." |
| SUP-PAY-008 | C | I | inactive supplier | POST → 400 "inactive supplier" |
| SUP-PAY-009 | C | I | single allocation success | `payment.supplierLotId` (legacy FK) populated; multi-allocation → null |
| SUP-PAY-010 | H | I | successful payment | Audit log entry: `action=PAYMENT, entityType=SupplierPayment, details.allocations[]` |
| SUP-PAY-011 | H | E2E | supplier profile → Payments tab → Record Payment | Multi-allocation dialog: select 2 lots, sum=total, submit → success |
| SUP-PAY-012 | H | E2E | (011) | Dialog submit blocked while sum ≠ total (red "over by X" or amber "X unallocated") |
| SUP-PAY-013 | H | E2E | supplier profile → Payments tab | Per-lot "Outstanding" recalculates from allocations after a new payment is recorded |
| SUP-PAY-014 | M | U | n/a | `generateSupplierReceiptNumber` → `REC-S-YYYYMMDD-NNN` |
| SUP-PAY-015 | L | I | payment with reference matching invoice # | Reference field is captured/stored |

## 10. Client Payments (Money In)

Symmetric to supplier — same scenarios with order in place of lot. Highlights:

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| CLI-PAY-001 | C | I | active client, 1 outstanding order | POST /api/payments/client legacy single-FK → 201 |
| CLI-PAY-002 | C | I | 3 orders | Multi-order allocation POST → 201 |
| CLI-PAY-003 | C | I | order belongs to other client | POST allocation → 400 "does not belong to specified client" |
| CLI-PAY-004 | C | I | order total 100k, paid 70k | Allocation of 40k → 400 "Overpayment blocked. Order total 100,000..." |
| CLI-PAY-005 | C | I | CANCELLED order | Allocation against it → 400 "cancelled and cannot accept payment" |
| CLI-PAY-006 | C | I | inactive client | POST → 400 "inactive client" |
| CLI-PAY-007 | H | I | new payment | `receiptNumber` `REC-C-YYYYMMDD-NNN` generated |
| CLI-PAY-008 | H | E2E | client profile → Payments | Multi-order dialog auto-fills amount = min(outstanding, remaining budget) on row check |
| CLI-PAY-009 | M | E2E | client profile | After payment, per-order Paid/Outstanding numbers update via allocation aggregation |

## 11. Miscellaneous Transactions

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| MISC-001 | C | I | OWNER | POST /api/misc-transactions `{direction:IN, category:"Owner Capital", amount:50000, ...}` → 201; receipt `MISC-IN-YYYYMMDD-NNN` |
| MISC-002 | C | I | OWNER | POST `{direction:OUT, category:"Electricity", ...}` → 201; receipt `MISC-OUT-YYYYMMDD-NNN` |
| MISC-003 | H | I | OWNER | POST with direction="INVALID" → 400 |
| MISC-004 | H | I | OWNER | POST with negative amount → 400 |
| MISC-005 | H | I | MANAGER | POST → 403 |
| MISC-006 | M | I | OWNER | GET /api/misc-transactions?direction=IN&search=capital → filtered list |
| MISC-007 | M | I | OWNER | GET with dateFrom and dateTo → date-bounded result |
| MISC-008 | M | E2E | Accounts → Misc In tab → + Record Misc In | Dialog submit succeeds, row appears in list |
| MISC-009 | L | I | n/a | Audit log entry for misc creation |

## 12. Production Batch Additional Cost

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| ADD-001 | C | I | IN_PROGRESS batch | Complete with `additionalCost: 5000` → batch.additionalCost = 5000; 1 MiscTransaction row created with direction OUT, productionBatchId set |
| ADD-002 | C | I | complete with `additionalCost: 0` (or omitted) | No MiscTransaction created; batch.additionalCost = null |
| ADD-003 | C | I | complete with `additionalCost: -10` | 400 "cannot be negative" |
| ADD-004 | C | I | complete fails due to validation | NO partial state — batch stays IN_PROGRESS, no misc row created (transactional) |
| ADD-005 | H | I | misc created by ADD-001 | description = "Batch {batchNumber} - Additional cost"; category = "Production Batch Cost"; paymentMethod = CASH |
| ADD-006 | H | I | batch with additionalCost > 0 | GET batch detail → includes miscTransactions in payload |
| ADD-007 | M | E2E | Production batch detail page | "Additional Cost" card shows amount + link to Misc Out receipt # |
| ADD-008 | M | E2E | batch with no additional cost | Card shows "No additional cost recorded" |
| ADD-009 | M | E2E | complete dialog | "Additional Cost" input below Quality Score; helper text explains misc linkage |
| ADD-010 | L | I | misc amount flows | Accounts → Misc Out tab includes the auto-created row; Net Cash Flow updated |

## 13. Accounts Page

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| ACC-001 | C | E2E | OWNER, accounts page | 4 tabs visible: Money In, Money Out, Misc In, Misc Out |
| ACC-002 | C | E2E | accounts page | No global PaymentForm in header (recording moved to per-entity profiles) |
| ACC-003 | C | E2E | accounts page | Two buttons: + Record Misc In (green), + Record Misc Out (rose) |
| ACC-004 | C | U | n/a | `getAccountsSummary.netBalance === totalIn - totalOut` where totalIn = received + miscIn |
| ACC-005 | C | I | data: client paid 100k, supplier paid 60k, misc in 20k, misc out 5k | netBalance = (100+20) - (60+5) = 55k |
| ACC-006 | H | E2E | Money In tab | Multi-allocation payment renders chip stack with per-allocation amount |
| ACC-007 | H | I | filters | ?search=INV-XXX matches via allocations.some.{order|supplierLot}.invoiceNumber |
| ACC-008 | M | E2E | summary cards | Top row: Total Payable, Total Receivable, Net Cash Flow (with In/Out subtitle) |
| ACC-009 | M | E2E | summary cards | Bottom row: Received (Clients), Paid (Suppliers), Misc In, Misc Out |
| ACC-010 | M | E2E | outstanding alerts panel | Suppliers + clients with outstanding > 0 surfaced |
| ACC-011 | L | E2E | tab via URL ?tab=misc-out | Misc Out tab opens by default on load |

## 14. Dashboard

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| DASH-001 | C | I | order with expectedDelivery < today, status CONFIRMED | Appears in overdueOrders |
| DASH-002 | C | I | expectedDelivery within next 7 days | Appears in closeToOverdueOrders (Due Soon) |
| DASH-003 | C | I | DISPATCHED or CANCELLED order | Excluded from both lists |
| DASH-004 | H | E2E | OWNER dashboard | Cards: Overdue Orders, Due Soon (7-day window), Lots in Audit, Good to Go, Batches in progress, Completed |
| DASH-005 | M | E2E | dashboard | Recent lots (5) + recent batches (5) panels render |
| DASH-006 | L | U | n/a | `getDashboardData` returns counts initialized to 0 for empty statuses |

## 15. Concurrency / Race Conditions

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| RACE-001 | C | I | batch outputQuantity=1000, availableOutput=1000 | Fire 2 concurrent fulfill POSTs, each for 600 → exactly one succeeds, other returns 400 "only has X available" |
| RACE-002 | C | I | order item ordered=100, quantityFulfilled=0 | 2 concurrent fulfill POSTs each for 60 → exactly one succeeds |
| RACE-003 | C | I | lot availableHusks=500 | 2 concurrent batch creations each consuming 400 husks → exactly one succeeds |
| RACE-004 | C | I | lot total 100k, allocations sum 80k | 2 concurrent supplier payments each allocating 25k against this lot → first allocates 20k (capped at remaining), second 400s — or both 400 if validation runs before lock |
| RACE-005 | H | I | order outstanding 50k | 2 concurrent client payments each allocating 30k → only one succeeds |
| RACE-006 | H | U | n/a | `updateMany({ where: { id, availableOutput: { gte: x } }, data: { decrement: x } })` returns count=0 when predicate fails |
| RACE-007 | M | I | within-payload deduplication | Single fulfill payload with 2 lines for same orderItemId, each 60, ordered=100 → second rejected (Postgres row-lock re-evaluates predicate) |

## 16. Data Migrations & Backfills

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| MIG-001 | C | I | fresh DB | `prisma db push` creates all tables and indexes |
| MIG-002 | C | I | DB with `DISPATCHED` batches | docker-entrypoint pre-migration backfill changes them to COMPLETED before enum alter |
| MIG-003 | C | I | DB with legacy single-FK SupplierPayment rows | Allocation backfill creates 1 allocation row per legacy payment |
| MIG-004 | C | I | DB with legacy single-FK ClientPayment rows | Allocation backfill creates 1 allocation row per legacy payment |
| MIG-005 | C | I | DB with orphan payment (no FK, no allocations) | Orphan reconcile auto-allocates oldest-lot-first, capped at lot.outstanding |
| MIG-006 | H | I | DB with COMPLETED batch missing `available_output` | Backfill sets it to `output_quantity - SUM(fulfillments.quantity_fulfilled)` |
| MIG-007 | H | I | re-running backfills | All backfills idempotent (no duplicates, no errors on re-run) |
| MIG-008 | H | I | orphan reconcile when supplier has no outstanding lots | Residual is logged; no exception |
| MIG-009 | M | I | entrypoint runs on schema mismatch | Prisma db push --accept-data-loss applied without dropping populated columns |

## 17. Validation & Input Hardening

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| VAL-001 | C | U | n/a | `paymentSchema.parse({ amount: -1 })` throws "must be positive" |
| VAL-002 | C | U | n/a | `paymentSchema.parse({ amount: 1e9 })` throws "cannot exceed 100,000,000 LKR" |
| VAL-003 | C | U | n/a | `miscTransactionSchema.parse({ direction: "FOO" })` throws |
| VAL-004 | C | U | n/a | `supplierPaymentAllocationSchema.parse({ supplierLotId: "not-uuid" })` throws |
| VAL-005 | H | U | n/a | `normalizeSriLankaPhoneNumber("0775551234")` === "+94775551234" |
| VAL-006 | H | U | n/a | `normalizeSriLankaPhoneNumber("+15555551234")` === undefined |
| VAL-007 | H | I | n/a | API POST with body containing extra unknown fields → ignored (Zod strict not used) |
| VAL-008 | M | I | XSS attempt in supplier name | Stored as-is, escaped at render via React (no innerHTML usage) |

## 18. Security

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| SEC-001 | C | I | HTTP request to any page | Response headers include: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy |
| SEC-002 | C | I | docker compose port mapping | PostgreSQL bound to 127.0.0.1:5434, not 0.0.0.0 |
| SEC-003 | C | I | container running | `whoami` returns `appuser`, not `root` |
| SEC-004 | C | I | git ls-files | `.env` not tracked |
| SEC-005 | H | I | sign-out via Tailscale URL | Lands on the same Tailscale URL (host-aware), not localhost |
| SEC-006 | H | I | POST /api/orders without session cookie | 401 |
| SEC-007 | H | I | brute-force scenario (out of scope for unit) | Manual: no rate limit today, document as accepted risk for v1 |
| SEC-008 | M | U | n/a | `bcrypt.compare` is constant-time (library guarantee) |

## 19. UI / UX

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| UX-001 | C | E2E | OWNER login on mobile (375px) | Sidebar collapses; main nav accessible |
| UX-002 | C | E2E | accounts page mobile | Tabs stack or scroll horizontally without truncation |
| UX-003 | H | E2E | summary cards mobile | Grid collapses cleanly (2 cols on sm, 3-4 on lg) |
| UX-004 | H | E2E | StatusBadge | Renders distinct color per status (AUDIT yellow, APPROVED blue, GOOD_TO_GO green, etc.) |
| UX-005 | M | E2E | print preview of any printable page | Looks like a clean invoice/receipt with no nav chrome |
| UX-006 | M | E2E | summary card hover | Tooltip text appears (currently native HTML title) |
| UX-007 | M | E2E | sign-out button | Located in sidebar; one-click; toast on success not expected (window.location replaces) |
| UX-008 | L | E2E | dropdown selects (Radix) | Never crash on empty string value (test that no SelectItem has value="") |

## 20. Printable Documents

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| PRINT-001 | C | E2E | order with 1 client payment | Sales invoice page renders with payment row, balance summary |
| PRINT-002 | C | E2E | order with multi-allocation client payment | Invoice "Payments Received" table shows that allocation's portion (not the whole payment amount) |
| PRINT-003 | C | E2E | single-allocation supplier payment | Receipt page renders single-lot layout with linked invoice number |
| PRINT-004 | C | E2E | multi-allocation supplier payment | Receipt page renders "Payment Against" table with per-lot rows + "Per-Lot Balance After This Payment" table |
| PRINT-005 | H | E2E | supplier lot detail | Lot invoice printable, supplier bank details rendered if present |
| PRINT-006 | M | E2E | production batch detail | Production report printable, traceability table renders |
| PRINT-007 | L | E2E | any print page | "Generated: {date} at {time}" footer present |

## 21. Reports & CSV Exports

| ID | Severity | Type | Pre | Steps → Expected |
|---|---|---|---|---|
| CSV-001 | C | E2E | accounts → Money In CSV | Headers include Receipt #, Date, Client, Order/Invoice, Method, Reference, Amount, Notes |
| CSV-002 | C | E2E | multi-allocation client payment in CSV | "Order / Invoice" cell contains `ORD-X / INV-X (50,000) \| ORD-Y / INV-Y (30,000)` |
| CSV-003 | C | E2E | misc-in / misc-out CSV | Contains category + description columns |
| CSV-004 | M | E2E | analytics endpoint | getBatchProfitability returns COMPLETED batches with revenue/profit/margin |
| CSV-005 | M | I | getAbnormalPaymentAlerts | Clients with totalPaid > 1.05 * totalRevenue surfaced; severity CRITICAL/HIGH/MEDIUM |
| CSV-006 | M | I | client with totalRevenue=0 and totalPaid>0 | percentageOverpaid === null; severity === CRITICAL |

## 22. Coverage Matrix

| Module | Unit | Integration | E2E | Total |
|---|---:|---:|---:|---:|
| Auth | 4 | 7 | 0 | 11 |
| Permissions | 3 | 6 | 1 | 10 |
| Suppliers | 2 | 10 | 0 | 12 |
| Supplier Lots | 1 | 15 | 1 | 17 |
| Production Batches | 1 | 11 | 1 | 13 |
| Order Fulfillment | 0 | 11 | 2 | 13 (incl. one U) |
| Clients | 0 | 6 | 1 | 7 |
| Orders | 0 | 8 | 2 | 10 |
| Supplier Payments | 1 | 10 | 3 | 15 (incl. one U) |
| Client Payments | 0 | 7 | 2 | 9 |
| Misc Transactions | 0 | 8 | 1 | 9 |
| Batch Additional Cost | 0 | 6 | 4 | 10 |
| Accounts Page | 1 | 2 | 8 | 11 |
| Dashboard | 1 | 3 | 2 | 6 |
| Concurrency | 1 | 6 | 0 | 7 |
| Migrations | 0 | 9 | 0 | 9 |
| Validation | 4 | 4 | 0 | 8 |
| Security | 1 | 6 | 0 | 7 |
| UI / UX | 0 | 0 | 8 | 8 |
| Print Documents | 0 | 0 | 7 | 7 |
| Reports / CSV | 0 | 3 | 3 | 6 |
| **Total** | **20** | **138** | **46** | **204** |

---

## Recommended test stack

| Layer | Tool | Notes |
|---|---|---|
| Unit | Vitest | Fast, jest-compatible, native ESM |
| Integration (API + DB) | Vitest + Prisma against an isolated **test database** | Each test wraps in a `prisma.$transaction` that rolls back on completion to keep tests independent |
| E2E | Playwright | Multi-browser, supports auth state caching, screenshots on failure |
| Race-condition tests (RACE-001 to 007) | Vitest + `Promise.all` + dedicated test DB | Run with `--no-isolate` to share connection pool; assert exactly one success |

## Setup notes

1. **Test database**: spin up a separate Postgres container or schema. Reset between runs via `prisma migrate reset --skip-seed --force`.
2. **Seeded fixtures**: minimal owner + manager + production user; one supplier with 3 lots in different statuses; one client with 2 orders; one in-progress batch and one completed batch.
3. **Auth helper**: a Playwright fixture that signs in once per role and caches the storage state.
4. **Mocking external systems**: nothing external today (no Stripe, no Google Drive yet) — when snapshot mode lands, mock rclone via a stub.

## Test data conventions

- **IDs**: prefer `seed_supplier_bimsara`, `seed_lot_001`, etc. — readable in failure messages
- **Money values**: use `100_000` not `100000` for readability; assert with tolerance for floating-point (`±0.01 LKR`)
- **Dates**: use `2026-05-15` style throughout; never `new Date()` in tests (clock-bound)
- **Receipt numbers**: `REC-S-20260515-001` etc. — predictable from seed

## Out-of-scope (document as accepted risk)

- API rate limiting / brute-force protection
- CSRF protection on custom API routes
- Audit log retention policy
- Email/SMS notifications
- Multi-tenancy
- Performance / load testing (single-tenant, modest scale)

---

**Document version:** 1.0
**Last updated:** 2026-05-17
**Total scenarios:** 204
