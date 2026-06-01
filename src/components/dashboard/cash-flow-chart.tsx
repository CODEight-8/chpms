"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CashFlowMonth {
  label: string;
  income: number;
  outgoing: number;
  clientIn: number;
  miscIn: number;
  supplierOut: number;
  miscOut: number;
  net: number;
}

interface CashFlowChartProps {
  data: CashFlowMonth[];
}

function formatLKR(value: number): string {
  return value.toLocaleString("en-LK", { maximumFractionDigits: 0 });
}

interface TooltipPayloadEntry {
  payload: CashFlowMonth;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm text-xs">
      <p className="font-medium text-gray-900 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-emerald-700">Client payments</span>
          <span className="font-medium">LKR {formatLKR(row.clientIn)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-sky-600">Miscellaneous in</span>
          <span className="font-medium">LKR {formatLKR(row.miscIn)}</span>
        </div>
        <div className="flex justify-between gap-6 border-t pt-1 mt-1 text-gray-600">
          <span>Total income</span>
          <span className="font-medium">LKR {formatLKR(row.income)}</span>
        </div>
        <div className="flex justify-between gap-6 pt-2">
          <span className="text-amber-700">Supplier payments</span>
          <span className="font-medium">LKR {formatLKR(row.supplierOut)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-rose-600">Miscellaneous out</span>
          <span className="font-medium">LKR {formatLKR(row.miscOut)}</span>
        </div>
        <div className="flex justify-between gap-6 border-t pt-1 mt-1 text-gray-600">
          <span>Total outgoing</span>
          <span className="font-medium">LKR {formatLKR(row.outgoing)}</span>
        </div>
        <div className="flex justify-between gap-6 border-t pt-1 mt-1">
          <span className="font-medium">Net</span>
          <span
            className={`font-bold ${row.net >= 0 ? "text-emerald-700" : "text-rose-600"}`}
          >
            LKR {formatLKR(row.net)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (data.every((d) => d.income === 0 && d.outgoing === 0)) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No cash flow data yet — record some payments to populate the chart.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" fontSize={12} />
        <YAxis
          fontSize={12}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
        <Legend
          formatter={(value: string) =>
            value === "clientIn"
              ? "Client Payments"
              : value === "miscIn"
                ? "Miscellaneous In"
                : value === "supplierOut"
                  ? "Supplier Payments"
                  : "Miscellaneous Out"
          }
        />
        {/* Income: stacked client payments (emerald) + misc in (sky blue)
            so both inflow types are clearly distinguishable. Sky vs emerald
            has higher contrast than the previous teal/emerald pairing. */}
        <Bar dataKey="clientIn" stackId="in" fill="#059669" />
        <Bar dataKey="miscIn" stackId="in" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        {/* Outgoing: stacked supplier payments (amber) + misc out (rose). */}
        <Bar dataKey="supplierOut" stackId="out" fill="#d97706" />
        <Bar dataKey="miscOut" stackId="out" fill="#e11d48" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
