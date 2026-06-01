"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SummaryCard } from "@/components/shared/summary-card";
import { DashboardExport } from "@/components/dashboard/dashboard-export";
import {
  TimePeriodFilter,
  DateRange,
} from "@/components/dashboard/time-period-filter";
import { formatLKR } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  Sliders,
  type LucideIcon,
} from "lucide-react";

interface FinancialData {
  totalProcurement: number;
  totalPaidSuppliers: number;
  outstandingPayable: number;
  totalRevenue: number;
  totalReceived: number;
  outstandingReceivable: number;
  grossProfit: number;
  netProfit: number;
  totalMiscOut: number;
  totalAdditionalCost: number;
}

type CardKey =
  | "PROCUREMENT"
  | "REVENUE"
  | "RECEIVED"
  | "GROSS_PROFIT"
  | "NET_PROFIT";

interface CardDef {
  key: CardKey;
  title: string;
  icon: LucideIcon;
  value: (d: FinancialData) => string;
  subtitle?: (d: FinancialData) => string | undefined;
}

const CARD_DEFS: CardDef[] = [
  {
    key: "PROCUREMENT",
    title: "Procurement Spend",
    icon: ArrowUpRight,
    value: (d) => formatLKR(d.totalProcurement),
    subtitle: (d) => `${formatLKR(d.outstandingPayable)} outstanding`,
  },
  {
    key: "REVENUE",
    title: "Revenue",
    icon: ArrowDownLeft,
    value: (d) => formatLKR(d.totalRevenue),
    subtitle: (d) => `${formatLKR(d.outstandingReceivable)} outstanding`,
  },
  {
    key: "RECEIVED",
    title: "Received",
    icon: Wallet,
    value: (d) => formatLKR(d.totalReceived),
  },
  {
    key: "GROSS_PROFIT",
    title: "Gross Profit",
    icon: TrendingUp,
    value: (d) => formatLKR(d.grossProfit),
    subtitle: () => "Received − Paid to suppliers",
  },
  {
    key: "NET_PROFIT",
    title: "Net Profit",
    icon: TrendingUp,
    value: (d) => formatLKR(d.netProfit),
    subtitle: (d) =>
      `After ${formatLKR(d.totalMiscOut + d.totalAdditionalCost)} operating expenses`,
  },
];

const MAX_VISIBLE = 3;
const DEFAULT_VISIBLE: CardKey[] = ["PROCUREMENT", "REVENUE", "GROSS_PROFIT"];
const STORAGE_KEY = "chpms.financialOverview.visibleCards";

function loadVisible(): CardKey[] {
  if (typeof window === "undefined") return DEFAULT_VISIBLE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE;
    const valid = parsed.filter((k): k is CardKey =>
      CARD_DEFS.some((d) => d.key === k)
    );
    if (valid.length === 0) return DEFAULT_VISIBLE;
    return valid.slice(0, MAX_VISIBLE);
  } catch {
    return DEFAULT_VISIBLE;
  }
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
  // Visible card keys, preserved in localStorage. Initialized on mount (not at
  // first render) so SSR + client hydration match.
  const [visibleKeys, setVisibleKeys] = useState<CardKey[]>(DEFAULT_VISIBLE);
  const [hydrated, setHydrated] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    setVisibleKeys(loadVisible());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleKeys));
  }, [visibleKeys, hydrated]);

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

  function toggleCard(key: CardKey, checked: boolean) {
    setVisibleKeys((prev) => {
      if (checked) {
        if (prev.includes(key)) return prev;
        // Enforce max — if at limit, refuse silently (UI also disables it).
        if (prev.length >= MAX_VISIBLE) return prev;
        // Keep the natural CARD_DEFS order in the rendered row.
        return CARD_DEFS.filter((d) => prev.includes(d.key) || d.key === key).map(
          (d) => d.key
        );
      }
      return prev.filter((k) => k !== key);
    });
  }

  const visibleCards = useMemo(
    () => CARD_DEFS.filter((d) => visibleKeys.includes(d.key)),
    [visibleKeys]
  );

  const csvData = data
    ? [
        {
          period: range.label,
          procurementSpend: data.totalProcurement.toFixed(2),
          revenue: data.totalRevenue.toFixed(2),
          receivedPayments: data.totalReceived.toFixed(2),
          grossProfit: data.grossProfit.toFixed(2),
          netProfit: data.netProfit.toFixed(2),
          outstandingPayable: data.outstandingPayable.toFixed(2),
          outstandingReceivable: data.outstandingReceivable.toFixed(2),
          miscOut: data.totalMiscOut.toFixed(2),
          additionalCost: data.totalAdditionalCost.toFixed(2),
        },
      ]
    : [];

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
          <h2 className="text-lg font-semibold">Financial Overview</h2>
          <span className="text-xs sm:text-sm text-muted-foreground truncate">
            {range.label}
            {range.from && (
              <span className="ml-1">
                ({range.from} – {range.to})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
                Customize
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Choose visible cards</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Pick up to {MAX_VISIBLE} cards to show in the Financial
                  Overview. {visibleKeys.length} / {MAX_VISIBLE} selected.
                </p>
                <div className="space-y-2">
                  {CARD_DEFS.map((d) => {
                    const checked = visibleKeys.includes(d.key);
                    const disabled = !checked && visibleKeys.length >= MAX_VISIBLE;
                    return (
                      <label
                        key={d.key}
                        className={`flex items-center gap-3 rounded-md border p-3 transition-colors ${
                          checked
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-gray-200"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-300"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => toggleCard(d.key, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
                        />
                        <d.icon className="h-4 w-4 text-emerald-700 shrink-0" />
                        <span className="text-sm font-medium">{d.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <DashboardExport
            data={csvData}
            filename={`financial-summary-${range.label.toLowerCase().replace(/\s+/g, "-")}`}
            columns={[
              { key: "period", header: "Period" },
              { key: "procurementSpend", header: "Procurement Spend (LKR)" },
              { key: "revenue", header: "Revenue (LKR)" },
              { key: "receivedPayments", header: "Received Payments (LKR)" },
              { key: "grossProfit", header: "Gross Profit (LKR)" },
              { key: "netProfit", header: "Net Profit (LKR)" },
              { key: "outstandingPayable", header: "Outstanding Payable (LKR)" },
              {
                key: "outstandingReceivable",
                header: "Outstanding Receivable (LKR)",
              },
              { key: "miscOut", header: "Misc Out (LKR)" },
              { key: "additionalCost", header: "Additional Cost (LKR)" },
            ]}
          />
        </div>
      </div>

      <div className="mb-4">
        <TimePeriodFilter onChange={handlePeriodChange} defaultPreset="this_month" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: Math.max(visibleCards.length, 1) }).map(
            (_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-8 bg-gray-200 rounded w-32" />
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      ) : data ? (
        visibleCards.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No cards selected. Click <strong>Customize</strong> to pick which
              cards to show.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCards.map((d) => (
              <SummaryCard
                key={d.key}
                title={d.title}
                value={d.value(data)}
                subtitle={d.subtitle?.(data)}
                icon={d.icon}
              />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
