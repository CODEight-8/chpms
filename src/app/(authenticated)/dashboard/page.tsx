import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessModule } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { getDashboardData } from "@/lib/queries/dashboard";
import {
  getMonthlyThroughput,
  getBatchProfitability,
  getSupplierAnalytics,
  getClientAnalytics,
} from "@/lib/queries/analytics";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ThroughputChart } from "@/components/dashboard/throughput-chart";
import { ProfitabilityChart } from "@/components/dashboard/profitability-chart";
import { DashboardExport } from "@/components/dashboard/dashboard-export";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardCheck,
  CheckCircle,
  Clock,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const isOwner = role === "OWNER";
  const isManager = role === "MANAGER";
  const canViewRankings = isOwner || isManager;
  const canViewClients = canAccessModule(role, "clients");

  const [data, throughput, profitability, supplierAnalytics, clientAnalytics] =
    await Promise.all([
      getDashboardData(),
      isOwner ? getMonthlyThroughput() : Promise.resolve([]),
      isOwner ? getBatchProfitability() : Promise.resolve([]),
      canViewRankings ? getSupplierAnalytics() : Promise.resolve([]),
      canViewRankings ? getClientAnalytics() : Promise.resolve([]),
    ]);

  // Flatten for CSV exports (owner only)
  const supplierCsvData = supplierAnalytics.map((s: Record<string, unknown>) => ({
    name: s.name,
    totalLots: s.totalLots,
    totalHusks: s.totalHusks,
    gradeA: s.gradeA,
    gradeB: s.gradeB,
    gradeC: s.gradeC,
    rejected: s.rejected,
    rejectionRate: (s.rejectionRate as number).toFixed(1),
    avgRate: (s.avgRate as number).toFixed(2),
    totalSpend: (s.totalSpend as number).toFixed(2),
    outstanding: (s.outstanding as number).toFixed(2),
  }));

  const clientCsvData = clientAnalytics.map((c: Record<string, unknown>) => ({
    name: c.name,
    totalOrders: c.totalOrders,
    totalRevenue: (c.totalRevenue as number).toFixed(2),
    totalPaid: (c.totalPaid as number).toFixed(2),
    outstanding: (c.outstanding as number).toFixed(2),
    paymentReliability: (c.paymentReliability as number).toFixed(1),
    orderFrequency: (c.orderFrequency as number).toFixed(2),
  }));

  const profitCsvData = profitability.map((b) => ({
    batchNumber: b.batchNumber,
    product: b.product,
    output: `${b.outputQuantity} ${b.outputUnit}`,
    rawMaterialCost: b.rawMaterialCost.toFixed(2),
    revenue: b.revenue.toFixed(2),
    profit: b.profit.toFixed(2),
    margin: b.margin.toFixed(1),
  }));

  return (
    <div className="pt-6">
      <PageHeader title="Dashboard" description="Business overview at a glance" />

      {/* Operational KPI Cards — visible to all roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Lots in Audit"
          value={data.kpis.lotsInAudit}
          icon={ClipboardCheck}
        />
        <SummaryCard
          title="Good to Go"
          value={data.kpis.lotsGoodToGo}
          icon={CheckCircle}
        />
        <SummaryCard
          title="Pending Orders"
          value={data.kpis.pendingOrders}
          icon={Clock}
        />
        <SummaryCard
          title="Confirmed Orders"
          value={data.kpis.confirmedOrders}
          icon={CheckCircle}
        />
      </div>

      {/* Financial Overview — OWNER only */}
      {isOwner && <FinancialOverview />}

      {/* Charts — OWNER only */}
      {isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Monthly Throughput (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThroughputChart data={throughput} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Batch Profitability</CardTitle>
                <DashboardExport
                  data={profitCsvData}
                  filename="batch-profitability"
                  columns={[
                    { key: "batchNumber", header: "Batch #" },
                    { key: "product", header: "Product" },
                    { key: "output", header: "Output" },
                    { key: "rawMaterialCost", header: "Raw Material Cost (LKR)" },
                    { key: "revenue", header: "Revenue (LKR)" },
                    { key: "profit", header: "Profit (LKR)" },
                    { key: "margin", header: "Margin (%)" },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ProfitabilityChart data={profitability} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rankings — OWNER and MANAGER */}
      {canViewRankings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Supplier Analytics */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Supplier Rankings</CardTitle>
                <DashboardExport
                  data={supplierCsvData}
                  filename="supplier-rankings"
                  columns={[
                    { key: "name", header: "Supplier" },
                    { key: "totalLots", header: "Lots" },
                    { key: "totalHusks", header: "Total Husks" },
                    { key: "gradeA", header: "Grade A" },
                    { key: "gradeB", header: "Grade B" },
                    { key: "gradeC", header: "Grade C" },
                    { key: "rejected", header: "Rejected" },
                    { key: "rejectionRate", header: "Reject %" },
                    { key: "avgRate", header: "Avg Rate (LKR)" },
                    { key: "totalSpend", header: "Total Spend (LKR)" },
                    { key: "outstanding", header: "Outstanding (LKR)" },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {supplierAnalytics.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No supplier data yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-center">Husks</TableHead>
                        <TableHead className="text-center">Quality</TableHead>
                        <TableHead className="text-center">Reject %</TableHead>
                        <TableHead className="text-right">Avg Rate</TableHead>
                        <TableHead className="text-right">Spend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierAnalytics.slice(0, 10).map((s: Record<string, unknown>) => (
                        <TableRow key={s.id as string}>
                          <TableCell>
                            <Link
                              href={`/suppliers/${s.id}`}
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              {s.name as string}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            {(s.totalHusks as number).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <span className="text-green-600">{s.gradeA as number}A</span>
                            {" / "}
                            <span className="text-blue-600">{s.gradeB as number}B</span>
                            {" / "}
                            <span className="text-yellow-600">{s.gradeC as number}C</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={
                                (s.rejectionRate as number) > 10
                                  ? "text-red-600 font-medium"
                                  : "text-green-600"
                              }
                            >
                              {(s.rejectionRate as number).toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatLKR(s.avgRate as number)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatLKR(s.totalSpend as number)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Analytics */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Client Rankings</CardTitle>
                <DashboardExport
                  data={clientCsvData}
                  filename="client-rankings"
                  columns={[
                    { key: "name", header: "Client" },
                    { key: "totalOrders", header: "Orders" },
                    { key: "totalRevenue", header: "Revenue (LKR)" },
                    { key: "totalPaid", header: "Paid (LKR)" },
                    { key: "outstanding", header: "Outstanding (LKR)" },
                    { key: "paymentReliability", header: "Payment %" },
                    { key: "orderFrequency", header: "Orders/Month" },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {clientAnalytics.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No client data yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-center">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-center">Payment %</TableHead>
                        <TableHead className="text-center">Freq</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientAnalytics.slice(0, 10).map((c: Record<string, unknown>) => (
                        <TableRow key={c.id as string}>
                          <TableCell>
                            {canViewClients ? (
                              <Link
                                href={`/clients/${c.id}`}
                                className="font-medium text-emerald-700 hover:underline"
                              >
                                {c.name as string}
                              </Link>
                            ) : (
                              <span className="font-medium text-gray-900">
                                {c.name as string}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {c.totalOrders as number}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatLKR(c.totalRevenue as number)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={
                                (c.paymentReliability as number) >= 80
                                  ? "text-green-600"
                                  : (c.paymentReliability as number) >= 50
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }
                            >
                              {(c.paymentReliability as number).toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm text-gray-600">
                            {(c.orderFrequency as number).toFixed(1)}/mo
                          </TableCell>
                          <TableCell className="text-right">
                            {(c.outstanding as number) > 0 ? (
                              <span className="text-orange-600">
                                {formatLKR(c.outstanding as number)}
                              </span>
                            ) : (
                              <span className="text-green-600">Paid</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity — visible to all roles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Lot Intakes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentLots.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No lots yet
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentLots.map((lot) => (
                  <div
                    key={lot.id}
                    className="flex items-center justify-between text-sm border-b pb-2"
                  >
                    <div>
                      <Link
                        href={`/supplier-lots/${lot.id}`}
                        className="font-mono text-emerald-700 hover:underline"
                      >
                        {lot.lotNumber}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {lot.supplier.name} &mdash; {lot.huskCount} husks
                      </p>
                    </div>
                    <StatusBadge status={lot.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Production Batches</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentBatches.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No batches yet
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between text-sm border-b pb-2"
                  >
                    <div>
                      <Link
                        href={`/production/${batch.id}`}
                        className="font-mono text-emerald-700 hover:underline"
                      >
                        {batch.batchNumber}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {batch.product.name}
                        {batch.outputQuantity
                          ? ` \u2014 ${Number(batch.outputQuantity)} ${batch.outputUnit}`
                          : ""}
                      </p>
                    </div>
                    <StatusBadge status={batch.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
