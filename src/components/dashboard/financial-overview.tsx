"use client";

import { useState, useEffect, useCallback } from "react";
import { SummaryCard } from "@/components/shared/summary-card";
import { DashboardExport } from "@/components/dashboard/dashboard-export";
import {
  TimePeriodFilter,
  DateRange,
} from "@/components/dashboard/time-period-filter";
import { formatLKR } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
} from "lucide-react";

interface FinancialData {
  totalProcurement: number;
  totalPaidSuppliers: number;
  outstandingPayable: number;
  totalRevenue: number;
  totalReceived: number;
  outstandingReceivable: number;
  grossProfit: number;
}

function getDefaultRange(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const to = now.toISOString().split("T")[0];
  return { from, to, label: "This Month" };
}

export function FinancialOverview() {
  const [range, setRange] = useState<DateRange>(getDefaultRange);
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (r: DateRange) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (r.from) params.set("from", r.from);
      if (r.to) params.set("to", r.to);
      const res = await fetch(`/api/dashboard/financial?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const handlePeriodChange = useCallback((newRange: DateRange) => {
    setRange(newRange);
  }, []);

  const csvData = data
    ? [
        {
          period: range.label,
          procurementSpend: data.totalProcurement.toFixed(2),
          revenue: data.totalRevenue.toFixed(2),
          receivedPayments: data.totalReceived.toFixed(2),
          grossProfit: data.grossProfit.toFixed(2),
          outstandingPayable: data.outstandingPayable.toFixed(2),
          outstandingReceivable: data.outstandingReceivable.toFixed(2),
        },
      ]
    : [];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Financial Overview</h2>
          <span className="text-sm text-muted-foreground">
            {range.label}
            {range.from && (
              <span className="ml-1">
                ({range.from} - {range.to})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DashboardExport
            data={csvData}
            filename={`financial-summary-${range.label.toLowerCase().replace(/\s+/g, "-")}`}
            columns={[
              { key: "period", header: "Period" },
              { key: "procurementSpend", header: "Procurement Spend (LKR)" },
              { key: "revenue", header: "Revenue (LKR)" },
              { key: "receivedPayments", header: "Received Payments (LKR)" },
              { key: "grossProfit", header: "Gross Profit (LKR)" },
              { key: "outstandingPayable", header: "Outstanding Payable (LKR)" },
              {
                key: "outstandingReceivable",
                header: "Outstanding Receivable (LKR)",
              },
            ]}
          />
        </div>
      </div>

      <div className="mb-4">
        <TimePeriodFilter onChange={handlePeriodChange} defaultPreset="this_month" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-8 bg-gray-200 rounded w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Procurement Spend"
            value={formatLKR(data.totalProcurement)}
            subtitle={`${formatLKR(data.outstandingPayable)} outstanding`}
            icon={ArrowUpRight}
          />
          <SummaryCard
            title="Revenue"
            value={formatLKR(data.totalRevenue)}
            subtitle={`${formatLKR(data.outstandingReceivable)} outstanding`}
            icon={ArrowDownLeft}
          />
          <SummaryCard
            title="Received"
            value={formatLKR(data.totalReceived)}
            icon={Wallet}
          />
          <SummaryCard
            title="Gross Profit"
            value={formatLKR(data.grossProfit)}
            icon={TrendingUp}
          />
        </div>
      ) : null}
    </div>
  );
}
