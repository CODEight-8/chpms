import Link from "next/link";
import { formatLKR } from "@/lib/currency";
import { getDashboardData } from "@/lib/queries/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { StatusBadge } from "@/components/shared/status-badge";
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
  Factory,
  Clock,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div>
      <PageHeader title="Dashboard" description="Business overview at a glance" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
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
          title="WIP Batches"
          value={data.kpis.batchesInProgress}
          icon={Factory}
        />
        <SummaryCard
          title="Ready to Ship"
          value={data.kpis.batchesCompleted}
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

      {/* Financial Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Procurement Spend"
          value={formatLKR(data.financial.totalProcurement)}
          subtitle={`${formatLKR(data.financial.outstandingPayable)} outstanding`}
          icon={ArrowUpRight}
        />
        <SummaryCard
          title="Revenue"
          value={formatLKR(data.financial.totalRevenue)}
          subtitle={`${formatLKR(data.financial.outstandingReceivable)} outstanding`}
          icon={ArrowDownLeft}
        />
        <SummaryCard
          title="Received"
          value={formatLKR(data.financial.totalReceived)}
          icon={Wallet}
        />
        <SummaryCard
          title="Net Cash Flow"
          value={formatLKR(data.financial.grossProfit)}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Best Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            {data.supplierRankings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No supplier data yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-center">Lots</TableHead>
                    <TableHead className="text-center">Husks</TableHead>
                    <TableHead className="text-center">Reject %</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.supplierRankings.slice(0, 5).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link
                          href={`/suppliers/${s.id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {s.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        {s.totalLots}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.totalHusks.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            s.rejectionRate > 10
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          {s.rejectionRate.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatLKR(s.totalSpend)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Best Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {data.clientRankings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No client data yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clientRankings.slice(0, 5).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/clients/${c.id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        {c.totalOrders}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatLKR(c.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.outstanding > 0 ? (
                          <span className="text-orange-600">
                            {formatLKR(c.outstanding)}
                          </span>
                        ) : (
                          <span className="text-green-600">Paid</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
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
                        {lot.supplier.name} — {lot.huskCount} husks
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
                          ? ` — ${Number(batch.outputQuantity)} ${batch.outputUnit}`
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
