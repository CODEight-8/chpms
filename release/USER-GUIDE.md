# CHPMS — User Guide

A practical guide to using the Coconut Husk Processing Management System day-to-day.

---

## Roles

CHPMS has three user roles. The first account created during setup is an **Owner**.

| Role | Can do |
|---|---|
| **Owner** | Everything: manage users, suppliers, lots, batches, clients, orders, payments, accounts, miscellaneous transactions |
| **Manager** | Suppliers, lots, production, orders, dashboard. **No access** to clients, accounts, users. |
| **Production** | View suppliers and lots; manage production batches; view orders. Read-only otherwise. |

Add new users from the **User Management** tab (Owner only).

---

## Typical daily flow

### 1. A supplier delivers husks → record a lot

1. **Suppliers** tab → click the supplier (or create them first)
2. Click **+ New Lot** on their profile
3. Enter: harvest date, date received, husk count, per-husk rate, quality grade
4. Save. System creates a lot number `SL-YYYYMMDD-NNN` and invoice number `INV-SL-…`
5. New lots start in **Audit** status

### 2. Approve a lot for production

1. Open the lot's detail page
2. Click **Approve** (Owner / Manager only)
3. Lot moves to **Approved**, then click **Mark Good to Go** when aged

### 3. Start a production batch

1. **Production** tab → **+ New Batch**
2. Pick product, chip size, and which lots to use
3. System locks the husks against those lots atomically — no double-allocation
4. Save. Batch starts in **In Progress**

### 4. Complete a batch

1. Open the batch's detail page → **Mark Complete**
2. Enter:
   - **Output Quantity (Kg)** — actual kg produced (≤ total input husks)
   - **Quality Score (%)** — 0–100, auto-graded into Good / Average / Reject
   - **Additional Cost (LKR)** — optional. Labor, electricity, fuel, packaging. **If > 0, automatically recorded as a "Misc Out" transaction.**
3. Save. Batch is ready to fulfill orders.

### 5. A client places an order

1. **Clients** tab → pick or create client
2. **+ New Order** with line items
3. Save. Order gets `ORD-…` and invoice `INV-ORD-…`

### 6. Fulfill an order from a completed batch

1. Open the order's detail page
2. For each line item, click **Fulfill**
3. Select one or more completed batches and the quantity from each
4. System decrements `availableOutput` atomically
5. When all items fully fulfilled, order auto-flips to **Fulfilled**
6. After delivery, set status to **Dispatched**

### 7. Print the invoice

Order detail → **Print Invoice**. Includes client details, line items, total,
payments received, outstanding balance.

---

## Recording payments

Payments are recorded from each entity's profile — **not from the global Accounts page**.

### Supplier payment

1. **Suppliers** → pick supplier → **Payments** tab → **Record Payment**
2. Enter total amount
3. Select one or more outstanding lots:
   - Checking a lot auto-fills amount with `min(outstanding, remaining budget)`
   - Edit any amount
4. The "Allocated X / Total Y" indicator must be green before submit
5. Receipt is generated (e.g. `REC-S-20260524-001`).

### Client payment

Same flow from a client profile, selecting outstanding orders.

### Multi-invoice payments

A single payment can settle **multiple** invoices. The receipt shows each allocation as a separate line.

### Overpayment is blocked

The system never lets the total paid against a lot or order exceed its total.
You'll see a clear error showing the lot/order total, already-paid amount, and outstanding balance.

---

## Accounts page

Owner-only. Four tabs:

| Tab | What it shows |
|---|---|
| **Money In** | All client payments with multi-invoice breakdown |
| **Money Out** | All supplier payments with multi-invoice breakdown |
| **Misc In** | Owner capital, asset injections, refunds |
| **Misc Out** | Bills, fuel, daily expenses, plus auto-generated batch additional costs |

**+ Record Misc In** and **+ Record Misc Out** buttons add miscellaneous entries.

### Summary cards

**Top:** Total Payable · Total Receivable · Net Cash Flow
**Bottom:** Received (Clients) · Paid (Suppliers) · Misc In · Misc Out

Net Cash Flow = (Money In + Misc In) − (Money Out + Misc Out).

---

## Production batch additional cost

- Enter Additional Cost > 0 when completing a batch
- System auto-creates a Misc Out with:
  - Description: `Batch PB-XXXXXXXX-NNN - Additional cost`
  - Category: `Production Batch Cost`
  - Receipt: `MISC-OUT-YYYYMMDD-NNN`
- Receipt links back to the batch
- Batch detail page shows "Additional Cost" card with the linked receipt

---

## Dashboard

- **Overdue Orders** — past expected delivery, not yet dispatched
- **Due Soon** — due within next 7 days
- **Lots in Audit / Good to Go** — pipeline
- **Batches in Progress / Completed** — production
- Recent lots and batches

---

## Quality guarantees

- **Phone numbers** must be Sri Lankan format (normalized to `+94XXXXXXXXX`)
- **Order quantities** never over-fulfilled
- **Lot husks** never over-allocated to production
- **Production output** never over-fulfilled to orders
- **Payments** never overpay any lot or order
- **Concurrent users** can't accidentally step on each other — enforced at the database level

---

## Tips

- **Search box** on every list page finds anything by number, invoice, or name
- **Print invoices and receipts** work with any standard printer
- **Misc In** is the right place for owner capital injections, opening cash balance, supplier refunds
- **Misc Out** is the right place for any cash outflow that isn't a supplier payment

---

**Need help?** Contact your CHPMS support team.
