# CHPMS — System Documentation

**Coconut Husk Processing Management System**

| Field | Detail |
|-------|--------|
| Prepared For | T.C. Liyanage |
| Developed By | CODEight PVT (LTD) |
| Document Date | 31 March 2026 |
| System Version | 1.0 |
| Proposal Version | 2.1 (22 March 2026) |

---

## 1. Executive Summary

CHPMS is a purpose-built application that digitises the complete operations of a coconut husk processing facility — from raw material intake through production, client orders, payments, and business intelligence.

The system runs entirely on local hardware via Docker (no cloud, no monthly fees). The facility owner accesses it remotely via Tailscale VPN from Hong Kong, while staff at the Sri Lanka facility use it on the local network.

**Key capabilities delivered:**
- Full supply chain traceability (Invoice → Lot → Batch → Order → Payment)
- Production batch management with chip size targeting and quality grading
- Client order lifecycle with multi-batch fulfillment
- Excel-style accounting with auto-calculated balances
- Owner dashboard with KPIs, charts, supplier/client rankings
- Role-based access control with audit logging

---

## 2. Requirements Coverage — Full Traceability Matrix

### 2.1 Supplier Management (FR-1.x)

| ID | Requirement | Priority | Status | Implementation |
|----|-------------|----------|--------|----------------|
| FR-1.1 | Add, edit, and deactivate supplier records (name, phone, location, bank details) | Must | DONE | Supplier CRUD with soft-delete via `isActive` flag. Pages: `/suppliers`, `/suppliers/new`, `/suppliers/[id]` |
| FR-1.2 | View supplier history: all lots supplied, grades, rejection rate | Must | DONE | Supplier detail page shows lot history table, quality grades, rejection rate calculation |
| FR-1.3 | View supplier payment balance (total owed vs. total paid) with invoice references | Must | DONE | Supplier detail shows payment history, outstanding balance auto-calculated from lot costs minus payments |

### 2.2 Supplier Lot Management — Material Intake (FR-2.x)

| ID | Requirement | Priority | Status | Implementation |
|----|-------------|----------|--------|----------------|
| FR-2.1 | Create supplier lot with: supplier, purchase invoice ID, harvest date, date received, husk count, per-husk rate (LKR), total cost (auto-calculated) | Must | DONE | Lot intake form captures all fields. Total cost = husk count x per-husk rate. Auto-generated invoice number (INV-YYYY-NNNN) |
| FR-2.2 | Generate unique lot number automatically (format: SL-YYYYMMDD-NNN) | Must | DONE | `generateLotNumber()` in `id-generators.ts` produces sequential lot numbers |
| FR-2.3 | Assign quality grade (A/B/C) or reject lot during audit | Must | DONE | Quality grade dropdown on lot detail page. Grades: A (Premium), B (Good), C (Fair), REJECT |
| FR-2.4 | Display batch aging (days since harvest/removal from coconut) for every lot | Must | DONE | `AgingIndicator` component with color-coded display. Green (<7 days), Yellow (7-14), Red (>14) |
| FR-2.5 | Manager manually marks lot as "Good to Go" when they assess it is ready | Must | DONE | Status action button on lot detail page. Manager decision based on aging + quality |
| FR-2.6 | System enforces: only "Good to Go" or available lots can be selected for production | Must | DONE | Batch creation API validates lot status is GOOD_TO_GO or ALLOCATED before allowing selection |
| FR-2.7 | Status flow: Audit → Good to Go → Allocated → Consumed / Rejected | Must | DONE | State machine in `status-machines.ts` enforces valid transitions. UI shows appropriate action buttons per status |
| FR-2.8 | Audit Report: Generate a printable report per lot | Must | DONE | Printable audit report page at `/supplier-lots/[id]/report` with lot number, supplier, grade, aging, quantity, harvest date, invoice ID, notes |
| FR-2.9 | Purchase invoice captured as reference and linked to accounting — Invoice ID is searchable and traceable | Must | DONE | Auto-generated invoice number (INV-YYYY-NNNN), printable invoice at `/supplier-lots/[id]/invoice`, linked to supplier payments |

### 2.3 Production Batch Management (FR-3.x)

| ID | Requirement | Priority | Status | Implementation |
|----|-------------|----------|--------|----------------|
| FR-3.1 | Create production batch by selecting multiple "Good to Go" or available supplier lots | Must | DONE | Batch form with multi-lot selector, quantity-per-lot input, +10/-10 adjustment buttons |
| FR-3.2 | Record how many husks from each lot were used (partial lot usage supported) | Must | DONE | `ProductionBatchLot` junction table tracks `quantityUsed` per lot. Lot's `availableHusks` decremented accordingly |
| FR-3.3 | Generate unique batch number (format: PB-YYYYMMDD-NNN) | Must | DONE | `generateBatchNumber()` in `id-generators.ts` |
| FR-3.4 | Record output quantity (e.g., 450 kg of coconut chips) on completion | Must | DONE | "Mark Complete" dialog captures output quantity and unit |
| FR-3.5 | Auto-calculate total raw material cost (sum of all lot costs used) | Must | DONE | `totalRawCost` calculated at batch creation: sum of (quantityUsed x perHuskRate) for each lot |
| FR-3.6 | View batch detail showing all supplier lots that contributed (traceability) | Must | DONE | Batch detail page shows "Supplier Lots Used (Traceability)" table with lot #, supplier, grade, aging, husks used, cost |
| FR-3.7 | Status flow: In Progress → Completed → Dispatched | Must | DONE | State machine enforces transitions. UI shows "Mark Complete" or "Mark Dispatched" buttons |
| FR-3.8 | Production Report: Generate a printable report per batch | Must | DONE | Printable report at `/production/[id]/report` with batch number, product type, input husks, output quantity, supplier lots, quality details, raw material cost, completion date |

**Additional production features (client-requested enhancements):**

| Feature | Status | Implementation |
|---------|--------|----------------|
| Target chip size per batch (5mm, 10mm, 15mm, 20mm, 25mm) | DONE | `chipSize` field on ProductionBatch. Required dropdown on batch creation form. Shown in list and detail pages |
| Special remarks for production instructions | DONE | `remarks` field separate from `notes`. Textarea with placeholder for client-specific requirements |
| Quality grading after production completion | DONE | `qualityScore` (0-100%) and auto-calculated `qualityGrade`: GOOD (>=75%), AVERAGE (10-74%), REJECT (<10%). Color-coded badges on list and detail pages |

### 2.4 Client & Order Management (FR-4.x)

| ID | Requirement | Priority | Status | Implementation |
|----|-------------|----------|--------|----------------|
| FR-4.1 | Add, edit, and deactivate client records (name, company, phone, email, address, payment terms) | Must | DONE | Client CRUD with soft-delete. Pages: `/clients`, `/clients/new`, `/clients/[id]` |
| FR-4.2 | Create order with: client, order date, delivery date, line items (product, quantity, unit price) | Must | DONE | Order form with multi-item support. Auto-generated order number (ORD-YYYYMMDD-NNN) |
| FR-4.3 | Fulfill orders by assigning completed production batches to order items | Must | DONE | Fulfillment form links order items to production batches with quantity tracking |
| FR-4.4 | One order can be fulfilled from multiple batches; one batch can serve multiple orders | Must | DONE | Many-to-many via `OrderFulfillment` table. `quantityFulfilled` tracked per fulfillment record |
| FR-4.5 | Order status tracking: Pending → Confirmed → Fulfilled → Dispatched → Cancelled | Must | DONE | State machine with all valid transitions. Auto-marks FULFILLED when all items complete |
| FR-4.6 | View order detail with full traceability: which batches, which supplier lots, which suppliers | Must | DONE | Order detail page shows fulfillment records linking to batches, and batch details link back to supplier lots |

### 2.5 Accounts — Excel-Style with Smart Features (FR-5.x)

| ID | Requirement | Priority | Status | Implementation |
|----|-------------|----------|--------|----------------|
| FR-5.1 | Table view for all payments — rows and columns, like a spreadsheet | Must | DONE | Accounts page with tabular payment lists for both supplier and client payments |
| FR-5.2 | Two tabs: "Money Out" (payments to suppliers) and "Money In" (payments from clients) | Must | DONE | Tab-based navigation between supplier payments and client payments |
| FR-5.3 | Each entry: amount, date, payment method (cash/bank/cheque), invoice/reference number, notes | Must | DONE | Payment form captures all fields. Payment methods: CASH, BANK, CHEQUE |
| FR-5.4 | Filter and sort by supplier/client, date range, payment method, invoice ID | Must | DONE | `AccountsFilters` component with date range and payment method filters |
| FR-5.5 | Auto-linked: selecting a supplier/client auto-pulls their history | Must | DONE | Supplier/client detail pages show linked payment history with lot/order references |
| FR-5.6 | Auto-balance: outstanding balance per supplier and per client auto-calculated | Must | DONE | Outstanding = total invoice cost - total paid. Calculated in queries, displayed in summaries |
| FR-5.7 | Summary cards: total payable, total receivable, net balance — auto-updated | Must | DONE | `SummaryCard` components on accounts page showing total paid out, total received, net position |
| FR-5.8 | Overdue alerts: highlight suppliers/clients with outstanding balances | Should | DONE | `OutstandingAlerts` component shows suppliers/clients with unpaid balances as warning cards |
| FR-5.9 | Payment history per supplier/client: click any name → see full payment timeline | Must | DONE | Supplier and client detail pages show full payment history tables with running totals |
| FR-5.10 | CSV export: download any filtered view as spreadsheet | Should | DONE | CSV export buttons on accounts page and dashboard analytics sections |

### 2.6 Dashboard & Business Intelligence (FR-6.x)

| ID | Requirement | Priority | Status | Implementation |
|----|-------------|----------|--------|----------------|
| FR-6.1 | Real-time KPIs: lots in audit (with aging), WIP batches, ready for dispatch, pending orders | Must | DONE | Dashboard shows KPI cards: lots in audit, WIP batches, ready for dispatch, pending orders, recent activity feed |
| FR-6.2 | Financial overview: total procurement spend, total revenue, gross profit, outstanding payables/receivables | Must | DONE | Financial summary section with total spend, revenue, gross profit, outstanding payable, outstanding receivable |
| FR-6.3 | Best Suppliers ranking: by quality, rejection rate, price competitiveness, volume | Must | DONE | Supplier rankings table with grade breakdown (A/B/C), rejection rate, avg rate, total husks, outstanding balance. Top 10 with CSV export |
| FR-6.4 | Best Clients ranking: by order volume, payment reliability, frequency | Must | DONE | Client rankings table with total orders, revenue, payment reliability %, order frequency. Top 10 with CSV export |
| FR-6.5 | Profitability per batch and per product charts | Should | DONE | `ProfitabilityChart` (recharts BarChart) showing cost vs revenue vs profit per batch. Color-coded profit bars |
| FR-6.6 | Weekly/monthly throughput charts (husks received vs. products produced) | Should | DONE | `ThroughputChart` (recharts BarChart) showing 6-month husks received vs output produced |
| FR-6.7 | CSV export for all reports (for accountant) | Should | DONE | `DashboardExport` component with CSV download on supplier rankings, client rankings, and batch profitability |

---

## 3. Additional Features (Beyond Original Proposal)

| Feature | Description |
|---------|-------------|
| **User Management** | Full CRUD for system users. OWNER can create, edit, deactivate, and reactivate accounts. Role assignment (Owner/Manager). Password reset capability |
| **Audit Logging** | Every mutation (create, update, delete, status change, completion, fulfillment, payment) is logged with user email, timestamp, and details JSON. Entity types: Supplier, SupplierLot, ProductionBatch, Order, Client, SupplierPayment, ClientPayment, User |
| **Production Quality Grading** | Quality score (% of chips matching target size) with auto-grade: GOOD (>=75%), AVERAGE (10-74%), REJECT (<10%). Color-coded badges throughout |
| **Chip Size Parameter** | Target chip size (5mm-25mm) per production batch, driven by order requirements |
| **Special Remarks** | Separate remarks field on production batches for client-specific instructions |
| **Printable Invoices** | Auto-generated purchase invoices for supplier lots at `/supplier-lots/[id]/invoice` |
| **Tailscale Remote Access** | Owner accesses the system from Hong Kong via Tailscale mesh VPN — no cloud, no SSL needed |

---

## 4. User Roles & Access Control (Current Implementation)

| Module | Manager | Owner |
|--------|---------|-------|
| Supplier Lots (intake, audit, invoices) | Full | Full |
| Suppliers (create, manage) | Full | Full |
| Production Batches (create, complete) | Full | Full |
| Audit & Production Reports | Full | Full |
| Clients (create, manage) | Full | Full |
| Orders (create, fulfill, manage) | Full | Full |
| Payments & Invoices | Full | Full |
| Dashboard & Analytics | View | Full |
| User Management | — | Full |

**Note:** The PRODUCTION role exists in the system schema but is currently deactivated per client request. Manager handles both management and production duties. The PRODUCTION role can be re-enabled in the future when additional staff are hired.

---

## 5. Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| UI Components | shadcn/ui (Radix UI primitives), Tailwind CSS 3.4 |
| Charts | Recharts 3.8 |
| Database | PostgreSQL 16 (Alpine) |
| ORM | Prisma 6.19 |
| Authentication | NextAuth 4.24 (Credentials provider, JWT sessions, 24h expiry) |
| Password Security | bcryptjs (12 salt rounds) |
| Validation | Zod 4.3 |
| Notifications | Sonner (toast) |
| Icons | Lucide React |
| Containerization | Docker multi-stage build, Docker Compose |
| Remote Access | Tailscale mesh VPN |

---

## 6. System Architecture

### 6.1 Deployment Model

```
┌─────────────────────────────────────────────────┐
│              Facility PC (Sri Lanka)             │
│                                                  │
│  ┌──────────────┐     ┌──────────────────────┐  │
│  │  PostgreSQL   │────▶│   Next.js App         │  │
│  │  (Docker)     │     │   (Docker, port 3000) │  │
│  │  Internal net │     │   Standalone build    │  │
│  └──────────────┘     └──────────────────────┘  │
│         │                       │                │
│         │ Docker internal       │ localhost:3000  │
│         │ network only          │                │
│         │ (not exposed)         ▼                │
│         │              ┌──────────────┐          │
│         │              │  Web Browser │          │
│         │              │  (Staff LAN) │          │
│         │              └──────────────┘          │
│         │                       │                │
└─────────┼───────────────────────┼────────────────┘
          │                       │
          │              Tailscale VPN
          │                       │
          │              ┌──────────────┐
          │              │ Owner (HK)   │
          │              │ Web Browser  │
          │              └──────────────┘
```

### 6.2 Database Schema — 13 Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `users` | System users | name, email, password_hash, role, is_active |
| `suppliers` | Raw material suppliers | name, phone, location, contact_person, bank_details |
| `supplier_lots` | Material intake records | lot_number, invoice_number, supplier_id, harvest_date, husk_count, available_husks, per_husk_rate, total_cost, quality_grade, status |
| `products` | Product catalog | name, unit, default_price |
| `production_batches` | Production runs | batch_number, product_id, chip_size, remarks, status, output_quantity, output_unit, quality_score, quality_grade, total_raw_cost |
| `production_batch_lots` | Lot-to-batch link (traceability) | production_batch_id, supplier_lot_id, quantity_used |
| `clients` | Customers | name, company_name, phone, email, address, payment_terms |
| `orders` | Client orders | order_number, client_id, order_date, expected_delivery, status |
| `order_items` | Order line items | order_id, product_id, quantity_ordered, unit_price, quantity_fulfilled |
| `order_fulfillments` | Batch-to-order fulfillment | order_item_id, production_batch_id, quantity_fulfilled |
| `supplier_payments` | Payments to suppliers | supplier_id, supplier_lot_id, amount, payment_date, payment_method, reference |
| `client_payments` | Payments from clients | client_id, order_id, amount, payment_date, payment_method, reference |
| `audit_logs` | Action audit trail | user_id, user_email, action, entity_type, entity_id, details (JSON) |

---

## 7. Traceability Chain

The system provides end-to-end traceability. From any point, you can trace forwards or backwards through the entire chain:

```
Invoice → Supplier Lot → Production Batch → Client Order → Payment
```

| Question | How It's Traced |
|----------|----------------|
| "This finished batch — which suppliers contributed?" | Production Batch → Batch Lots → Supplier Lots → Suppliers |
| "This client order — where did the material come from?" | Order → Fulfillments → Batch → Batch Lots → Supplier Lots → Suppliers |
| "This invoice — which lot and batch used it?" | Invoice ID → Supplier Lot → Production Batch Lots → Batches → Orders |
| "This supplier — what products used their material?" | Supplier → Lots → Batch Lots → Batches → Products |
| "What's our profit on this batch/order?" | Revenue (order price) - Cost (sum of supplier lot costs) |
| "A quality issue was found — which supplier is responsible?" | Finished Batch → Batch Lots → Supplier Lots → Supplier(s) |

---

## 8. Project Phases — Delivery Status

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1: Foundation** | Project setup, database schema, authentication, app shell, navigation | COMPLETE |
| **Phase 2: Supplier Lots & Invoices** | Supplier CRUD, lot intake, purchase invoice capture, quality audit, batch aging, audit reports | COMPLETE |
| **Phase 3: Production Batches + Reports** | Batch creation with multi-lot allocation, processing, output recording, production reports, traceability | COMPLETE |
| **Phase 4: Clients, Orders & Fulfillment** | Client management, order creation with line items, order fulfillment from batches, order status lifecycle | COMPLETE |
| **Phase 5: Payments & Accounting** | Excel-style payment tracking, supplier/client payments, outstanding balances, overdue alerts, CSV export | COMPLETE |
| **Phase 6: Dashboard & Analytics** | Owner dashboard, KPIs, financial overview, supplier/client rankings, throughput/profitability charts, CSV export | COMPLETE |
| **Phase 7: Polish & Install** | Testing, Docker deployment, local network setup, Tailscale VPN, staff training | IN PROGRESS |

**Post-proposal enhancements delivered:**
- User management module (OWNER-only)
- Audit logging for all mutations
- Production chip size parameter
- Production quality grading (GOOD/AVERAGE/REJECT)
- Special remarks for production batches

---

## 9. Pages & Navigation Map

| Page | URL | Access |
|------|-----|--------|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All roles |
| Suppliers List | `/suppliers` | Manager, Owner |
| Add Supplier | `/suppliers/new` | Manager, Owner |
| Supplier Detail | `/suppliers/[id]` | Manager, Owner |
| Supplier Lots List | `/supplier-lots` | Manager, Owner |
| Add Supplier Lot | `/supplier-lots/new` | Manager, Owner |
| Lot Detail | `/supplier-lots/[id]` | Manager, Owner |
| Lot Invoice (Print) | `/supplier-lots/[id]/invoice` | Manager, Owner |
| Lot Audit Report (Print) | `/supplier-lots/[id]/report` | Manager, Owner |
| Production Batches | `/production` | Manager, Owner |
| New Batch | `/production/new` | Manager, Owner |
| Batch Detail | `/production/[id]` | Manager, Owner |
| Production Report (Print) | `/production/[id]/report` | Manager, Owner |
| Clients List | `/clients` | Manager, Owner |
| Add Client | `/clients/new` | Manager, Owner |
| Client Detail | `/clients/[id]` | Manager, Owner |
| Orders List | `/orders` | Manager, Owner |
| New Order | `/orders/new` | Manager, Owner |
| Order Detail | `/orders/[id]` | Manager, Owner |
| Accounts | `/accounts` | Manager, Owner |
| User Management | `/users` | Owner only |
| Add User | `/users/new` | Owner only |
| User Detail | `/users/[id]` | Owner only |

---

## 10. API Endpoints

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suppliers` | List suppliers with stats |
| POST | `/api/suppliers` | Create supplier |
| GET | `/api/suppliers/[id]` | Get supplier detail |
| PUT | `/api/suppliers/[id]` | Update supplier |
| DELETE | `/api/suppliers/[id]` | Deactivate supplier |

### Supplier Lots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/supplier-lots` | List lots with aging/filters |
| POST | `/api/supplier-lots` | Create lot intake |
| GET | `/api/supplier-lots/[id]` | Get lot detail |
| PATCH | `/api/supplier-lots/[id]` | Update lot |
| PATCH | `/api/supplier-lots/[id]/status` | Change lot status |
| DELETE | `/api/supplier-lots/[id]` | Delete lot if it has no linked production usage or supplier payments |

### Production Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/production-batches` | List batches |
| POST | `/api/production-batches` | Create batch (allocate lots) |
| GET | `/api/production-batches/[id]` | Get batch detail |
| PATCH | `/api/production-batches/[id]/complete` | Complete batch (output + quality) |
| PATCH | `/api/production-batches/[id]/status` | Change batch status |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/[id]` | Get order detail |
| PATCH | `/api/orders/[id]` | Update order |
| PATCH | `/api/orders/[id]/status` | Change order status |
| POST | `/api/orders/[id]/fulfill` | Fulfill order from batches |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List clients with stats |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/[id]` | Get client detail |
| PUT | `/api/clients/[id]` | Update client |
| DELETE | `/api/clients/[id]` | Deactivate client |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/supplier` | List supplier payments |
| POST | `/api/payments/supplier` | Record supplier payment |
| GET | `/api/payments/client` | List client payments |
| POST | `/api/payments/client` | Record client payment |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| GET | `/api/users/[id]` | Get user detail |
| PUT | `/api/users/[id]` | Update user |
| DELETE | `/api/users/[id]` | Deactivate user |
| POST | `/api/users/[id]/reactivate` | Reactivate user |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List active products |
| POST | `/api/auth/[...nextauth]` | NextAuth authentication |

---

## 11. Security & Data Protection

| Aspect | Implementation |
|--------|----------------|
| Authentication | NextAuth with credentials provider, email + bcrypt-hashed password |
| Session | JWT strategy, 24-hour max age, role embedded in token |
| Password Hashing | bcryptjs with 12 salt rounds |
| Route Protection | Middleware protects all `/dashboard/*`, `/suppliers/*`, `/production/*`, `/clients/*`, `/orders/*`, `/accounts/*`, `/users/*` routes |
| API Authorization | `requireAuth(module, permission)` checks session + role-based permission matrix on every API call |
| Input Validation | Zod schemas validate all API inputs (type-safe, max lengths, format constraints) |
| Database Isolation | PostgreSQL runs on Docker internal network only — not exposed to host |
| Audit Trail | All mutations logged with user identity, action, entity, and details |
| Soft Delete | Users, suppliers, and clients are deactivated (not deleted) — data preserved |
| Owner Protection | Cannot deactivate own account, cannot deactivate last owner, only one active owner allowed |

---

## 12. Deployment Instructions

### Prerequisites
- Docker and Docker Compose installed on the facility PC
- `.env` file with required variables

### Environment Variables
```
DB_PASSWORD=<strong-password>
NEXTAUTH_SECRET=<random-base64-string>
OWNER_EMAIL=<owner-login-email>
OWNER_PASSWORD=<owner-login-password>
```

### Start the System
```bash
docker compose up -d --build
```

### Access
- Local: `http://localhost:3000`
- LAN: `http://<pc-ip>:3000`
- Remote (Owner): `http://<tailscale-ip>:3000`

### First Login
The seed script automatically creates the OWNER account using `OWNER_EMAIL` and `OWNER_PASSWORD` from the `.env` file on first boot.

---

## 13. Summary

CHPMS delivers **100% of the "Must" priority requirements** from the business proposal (FR-1.x through FR-6.4), plus all "Should" priority features (FR-5.8, FR-5.10, FR-6.5, FR-6.6, FR-6.7). Additionally, client-requested enhancements for production chip sizing, quality grading, and user management have been implemented.

**Total functional requirements: 44 identified, 44 delivered.**

The remaining work (Phase 7: Polish & Install) covers final testing, deployment to the client's facility PC, Tailscale VPN configuration, automated backups, and staff training.

---

*Document generated 31 March 2026 — CODEight PVT (LTD)*
