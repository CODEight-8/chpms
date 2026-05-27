import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessModule, hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import {
  getSupplierPayments,
  getClientPayments,
  getMiscTransactions,
  getAccountsSummary,
  getOutstandingSuppliers,
  getOutstandingClients,
} from "@/lib/queries/accounts";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { Pagination } from "@/components/shared/pagination";
import { parsePagination } from "@/lib/pagination";
import { RecordMiscTransaction } from "@/components/accounts/record-misc-transaction";
import { AccountsFilters } from "@/components/accounts/accounts-filters";
import { OutstandingAlerts } from "@/components/accounts/outstanding-alerts";
import { CsvExport } from "@/components/accounts/csv-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  Coins,
  Receipt,
} from "lucide-react";

type SupplierAllocation = {
  amount: unknown;
  supplierLot: {
    id: string;
    lotNumber: string;
    invoiceNumber: string;
  };
};

type ClientAllocation = {
  amount: unknown;
  order: {
    id: string;
    orderNumber: string;
    invoiceNumber: string;
  };
};

function formatInvoiceChips(
  legacyLabel: string | null,
  allocations: Array<{ amount: unknown; label: string }>
): React.ReactNode {
  if (allocations.length > 1) {
    return (
      <div className="flex flex-col gap-0.5">
        {allocations.map((a, i) => (
          <span key={i} className="font-mono text-[11px] text-gray-600">
            {a.label}{" "}
            <span className="text-gray-400">
              ({formatLKR(Number(a.amount))})
            </span>
          </span>
        ))}
      </div>
    );
  }
  if (allocations.length === 1) {
    return (
      <span className="font-mono text-xs text-gray-500">
        {allocations[0].label}
      </span>
    );
  }
  if (legacyLabel) {
    return <span className="font-mono text-xs text-gray-500">{legacyLabel}</span>;
  }
  return <span className="text-gray-400">-</span>;
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canCreate = hasPermission(role, "accounts", "create");
  const canViewClients = canAccessModule(role, "clients");

  const search = pickString(searchParams.search);
  const method = pickString(searchParams.method);
  const dateFrom = pickString(searchParams.dateFrom);
  const dateTo = pickString(searchParams.dateTo);
  const tabParam = pickString(searchParams.tab);

  const filters = { search, method, dateFrom, dateTo };

  // Per-tab pagination so changing pages on one tab does not reset the others.
  const inPg = parsePagination(searchParams, { paramPrefix: "in" });
  const outPg = parsePagination(searchParams, { paramPrefix: "out" });
  const miscInPg = parsePagination(searchParams, { paramPrefix: "miscIn" });
  const miscOutPg = parsePagination(searchParams, { paramPrefix: "miscOut" });

  const [
    supplierPayments,
    clientPayments,
    miscIn,
    miscOut,
    // Unpaginated copies for CSV export so "Download all" stays accurate.
    // Hits the DB a second time per tab, accepted trade-off (export is rare,
    // table render is fast).
    supplierPaymentsAll,
    clientPaymentsAll,
    miscInAll,
    miscOutAll,
    summary,
    outstandingSuppliers,
    outstandingClients,
  ] = await Promise.all([
    getSupplierPayments(filters, { skip: outPg.skip, take: outPg.take }),
    getClientPayments(filters, { skip: inPg.skip, take: inPg.take }),
    getMiscTransactions(
      { ...filters, direction: "IN" },
      { skip: miscInPg.skip, take: miscInPg.take }
    ),
    getMiscTransactions(
      { ...filters, direction: "OUT" },
      { skip: miscOutPg.skip, take: miscOutPg.take }
    ),
    getSupplierPayments(filters),
    getClientPayments(filters),
    getMiscTransactions({ ...filters, direction: "IN" }),
    getMiscTransactions({ ...filters, direction: "OUT" }),
    getAccountsSummary(),
    getOutstandingSuppliers(),
    getOutstandingClients(),
  ]);

  // CSV-friendly representations. Multi-allocation payments get a "+" suffix
  // listing all invoices and amounts; single allocations look the same as the
  // legacy single-FK rows so downstream tooling does not break.
  const supplierCsvData = supplierPaymentsAll.rows.map((p) => {
    const allocs = (p.allocations as SupplierAllocation[]).map(
      (a) =>
        `${a.supplierLot.lotNumber} / ${a.supplierLot.invoiceNumber} (${formatLKR(Number(a.amount))})`
    );
    const lotField =
      allocs.length > 0
        ? allocs.join(" | ")
        : p.supplierLot
          ? `${p.supplierLot.lotNumber} / ${p.supplierLot.invoiceNumber}`
          : "";
    return {
      receipt: p.receiptNumber,
      date: new Date(p.paymentDate).toLocaleDateString("en-LK"),
      supplier: p.supplier.name,
      lot: lotField,
      method: p.paymentMethod,
      reference: p.reference || "",
      amount: Number(p.amount).toFixed(2),
      notes: p.notes || "",
    };
  });

  const clientCsvData = clientPaymentsAll.rows.map((p) => {
    const allocs = (p.allocations as ClientAllocation[]).map(
      (a) =>
        `${a.order.orderNumber} / ${a.order.invoiceNumber} (${formatLKR(Number(a.amount))})`
    );
    const orderField =
      allocs.length > 0
        ? allocs.join(" | ")
        : p.order
          ? `${p.order.orderNumber} / ${p.order.invoiceNumber}`
          : "";
    return {
      receipt: p.receiptNumber,
      date: new Date(p.paymentDate).toLocaleDateString("en-LK"),
      client: p.client.name,
      order: orderField,
      method: p.paymentMethod,
      reference: p.reference || "",
      amount: Number(p.amount).toFixed(2),
      notes: p.notes || "",
    };
  });

  const miscInCsvData = miscInAll.rows.map((t) => ({
    receipt: t.receiptNumber,
    date: new Date(t.transactionDate).toLocaleDateString("en-LK"),
    category: t.category,
    description: t.description,
    method: t.paymentMethod,
    reference: t.reference || "",
    amount: Number(t.amount).toFixed(2),
    notes: t.notes || "",
  }));

  const miscOutCsvData = miscOutAll.rows.map((t) => ({
    receipt: t.receiptNumber,
    date: new Date(t.transactionDate).toLocaleDateString("en-LK"),
    category: t.category,
    description: t.description,
    method: t.paymentMethod,
    reference: t.reference || "",
    amount: Number(t.amount).toFixed(2),
    notes: t.notes || "",
  }));

  const initialTab =
    tabParam && ["in", "out", "misc-in", "misc-out"].includes(tabParam)
      ? tabParam
      : "in";

  return (
    <div className="pt-6">
      <PageHeader
        title="Accounts"
        description="Payments are recorded from each supplier or client profile. Miscellaneous in/out are recorded here."
      />

      {/* Summary Cards — top row: outstanding business, bottom row: cash movement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
        <SummaryCard
          title="Total Payable"
          value={formatLKR(summary.totalPayable)}
          subtitle={`${formatLKR(summary.outstandingPayable)} outstanding`}
          tooltip="Total supplier lot cost; subtitle is what is still owed to suppliers."
          icon={ArrowUpRight}
        />
        <SummaryCard
          title="Total Receivable"
          value={formatLKR(summary.totalReceivable)}
          subtitle={`${formatLKR(summary.outstandingReceivable)} outstanding`}
          tooltip="Total value of non-cancelled orders; subtitle is what is still owed by clients."
          icon={ArrowDownLeft}
        />
        <SummaryCard
          title="Net Cash Flow"
          value={formatLKR(summary.netBalance)}
          subtitle={`In ${formatLKR(summary.totalIn)} − Out ${formatLKR(summary.totalOut)}`}
          tooltip="Total inflows (client payments + misc in) minus total outflows (supplier payments + misc out). Outstanding amounts are not included — they are not yet cash."
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Received (Clients)"
          value={formatLKR(summary.totalReceivedFromClients)}
          tooltip="Cash received from clients against their orders."
          icon={Wallet}
        />
        <SummaryCard
          title="Paid (Suppliers)"
          value={formatLKR(summary.totalPaidToSuppliers)}
          tooltip="Cash paid to suppliers against their lots."
          icon={Wallet}
        />
        <SummaryCard
          title="Misc In"
          value={formatLKR(summary.totalMiscIn)}
          tooltip="Owner capital, asset injections, refunds — every inflow that is not a client payment."
          icon={Coins}
        />
        <SummaryCard
          title="Misc Out"
          value={formatLKR(summary.totalMiscOut)}
          tooltip="Electricity, bills, food, daily operating expenses — every outflow that is not a supplier payment."
          icon={Receipt}
        />
      </div>

      {/* Outstanding Alerts */}
      <OutstandingAlerts
        suppliers={outstandingSuppliers}
        clients={outstandingClients}
        linkClients={canViewClients}
      />

      {/* Filters */}
      <AccountsFilters />

      {/* Accounting Tabs */}
      <Tabs defaultValue={initialTab} className="space-y-4">
        <div className="space-y-3">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="in" className="flex-1 sm:flex-none">
              Money In ({clientPayments.total})
            </TabsTrigger>
            <TabsTrigger value="out" className="flex-1 sm:flex-none">
              Money Out ({supplierPayments.total})
            </TabsTrigger>
            <TabsTrigger value="misc-in" className="flex-1 sm:flex-none">
              Misc In ({miscIn.total})
            </TabsTrigger>
            <TabsTrigger value="misc-out" className="flex-1 sm:flex-none">
              Misc Out ({miscOut.total})
            </TabsTrigger>
          </TabsList>
          {canCreate && (
            <div className="flex flex-wrap gap-2">
              <RecordMiscTransaction direction="IN" />
              <RecordMiscTransaction direction="OUT" />
            </div>
          )}
        </div>

        {/* Money In — client payments */}
        <TabsContent value="in">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Client Payments (Money In)
                </CardTitle>
                <CsvExport
                  data={clientCsvData}
                  filename="client-payments"
                  columns={[
                    { key: "receipt", header: "Receipt #" },
                    { key: "date", header: "Date" },
                    { key: "client", header: "Client" },
                    { key: "order", header: "Order / Invoice" },
                    { key: "method", header: "Method" },
                    { key: "reference", header: "Reference" },
                    { key: "amount", header: "Amount (LKR)" },
                    { key: "notes", header: "Notes" },
                  ]}
                />
              </div>
              <p className="text-xs text-gray-500">
                Recorded from each client&apos;s profile. Multi-invoice payments
                show every linked invoice with its allocated amount.
              </p>
            </CardHeader>
            <CardContent>
              {clientPayments.total === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No client payments found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Order / Invoice</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientPayments.rows.map((p) => {
                      const allocations = (p.allocations as ClientAllocation[]).map(
                        (a) => ({
                          amount: a.amount,
                          label: `${a.order.orderNumber} / ${a.order.invoiceNumber}`,
                        })
                      );
                      const legacy = p.order
                        ? `${p.order.orderNumber} / ${p.order.invoiceNumber}`
                        : null;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Link
                              href={`/payments/client/${p.id}/receipt`}
                              className="font-mono text-xs text-emerald-700 hover:underline"
                            >
                              {p.receiptNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {new Date(p.paymentDate).toLocaleDateString("en-LK")}
                          </TableCell>
                          <TableCell>
                            {canViewClients ? (
                              <Link
                                href={`/clients/${p.client.id}`}
                                className="text-emerald-700 hover:underline"
                              >
                                {p.client.name}
                              </Link>
                            ) : (
                              <span className="text-gray-700">{p.client.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatInvoiceChips(legacy, allocations)}
                          </TableCell>
                          <TableCell>{p.paymentMethod}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatLKR(p.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Pagination
                total={clientPayments.total}
                page={inPg.page}
                perPage={inPg.perPage}
                pageParam={inPg.pageParam}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Money Out — supplier payments */}
        <TabsContent value="out">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Supplier Payments (Money Out)
                </CardTitle>
                <CsvExport
                  data={supplierCsvData}
                  filename="supplier-payments"
                  columns={[
                    { key: "receipt", header: "Receipt #" },
                    { key: "date", header: "Date" },
                    { key: "supplier", header: "Supplier" },
                    { key: "lot", header: "Lot / Invoice" },
                    { key: "method", header: "Method" },
                    { key: "reference", header: "Reference" },
                    { key: "amount", header: "Amount (LKR)" },
                    { key: "notes", header: "Notes" },
                  ]}
                />
              </div>
              <p className="text-xs text-gray-500">
                Recorded from each supplier&apos;s profile. Multi-lot payments
                show every linked lot with its allocated amount.
              </p>
            </CardHeader>
            <CardContent>
              {supplierPayments.total === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No supplier payments found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Lot / Invoice</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPayments.rows.map((p) => {
                      const allocations = (
                        p.allocations as SupplierAllocation[]
                      ).map((a) => ({
                        amount: a.amount,
                        label: `${a.supplierLot.lotNumber} / ${a.supplierLot.invoiceNumber}`,
                      }));
                      const legacy = p.supplierLot
                        ? `${p.supplierLot.lotNumber} / ${p.supplierLot.invoiceNumber}`
                        : null;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Link
                              href={`/payments/supplier/${p.id}/receipt`}
                              className="font-mono text-xs text-emerald-700 hover:underline"
                            >
                              {p.receiptNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {new Date(p.paymentDate).toLocaleDateString("en-LK")}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/suppliers/${p.supplier.id}`}
                              className="text-emerald-700 hover:underline"
                            >
                              {p.supplier.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {formatInvoiceChips(legacy, allocations)}
                          </TableCell>
                          <TableCell>{p.paymentMethod}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatLKR(p.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Pagination
                total={supplierPayments.total}
                page={outPg.page}
                perPage={outPg.perPage}
                pageParam={outPg.pageParam}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Misc In */}
        <TabsContent value="misc-in">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Miscellaneous In (Owner capital, asset injections, etc.)
                </CardTitle>
                <CsvExport
                  data={miscInCsvData}
                  filename="misc-in"
                  columns={[
                    { key: "receipt", header: "Receipt #" },
                    { key: "date", header: "Date" },
                    { key: "category", header: "Category" },
                    { key: "description", header: "Description" },
                    { key: "method", header: "Method" },
                    { key: "reference", header: "Reference" },
                    { key: "amount", header: "Amount (LKR)" },
                    { key: "notes", header: "Notes" },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {miscIn.total === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No miscellaneous inflows recorded
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {miscIn.rows.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs text-emerald-700">
                          {t.receiptNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(t.transactionDate).toLocaleDateString("en-LK")}
                        </TableCell>
                        <TableCell className="font-medium">{t.category}</TableCell>
                        <TableCell className="max-w-xs truncate text-gray-600">
                          {t.description}
                        </TableCell>
                        <TableCell>{t.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatLKR(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Pagination
                total={miscIn.total}
                page={miscInPg.page}
                perPage={miscInPg.perPage}
                pageParam={miscInPg.pageParam}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Misc Out */}
        <TabsContent value="misc-out">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Miscellaneous Out (Electricity, bills, daily expenses, etc.)
                </CardTitle>
                <CsvExport
                  data={miscOutCsvData}
                  filename="misc-out"
                  columns={[
                    { key: "receipt", header: "Receipt #" },
                    { key: "date", header: "Date" },
                    { key: "category", header: "Category" },
                    { key: "description", header: "Description" },
                    { key: "method", header: "Method" },
                    { key: "reference", header: "Reference" },
                    { key: "amount", header: "Amount (LKR)" },
                    { key: "notes", header: "Notes" },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {miscOut.total === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No miscellaneous outflows recorded
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {miscOut.rows.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs text-rose-700">
                          {t.receiptNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(t.transactionDate).toLocaleDateString("en-LK")}
                        </TableCell>
                        <TableCell className="font-medium">{t.category}</TableCell>
                        <TableCell className="max-w-xs truncate text-gray-600">
                          {t.description}
                        </TableCell>
                        <TableCell>{t.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatLKR(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Pagination
                total={miscOut.total}
                page={miscOutPg.page}
                perPage={miscOutPg.perPage}
                pageParam={miscOutPg.pageParam}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
