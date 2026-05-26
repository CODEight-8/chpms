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
          <span className="text-emerald-700">Income (client payments)</span>
          <span className="font-medium">LKR {formatLKR(row.income)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-rose-600">Outgoing</span>
          <span className="font-medium">LKR {formatLKR(row.outgoing)}</span>
        </div>
        <div className="ml-3 flex justify-between gap-6 text-gray-500">
          <span>· Suppliers</span>
          <span>LKR {formatLKR(row.supplierOut)}</span>
        </div>
        <div className="ml-3 flex justify-between gap-6 text-gray-500">
          <span>· Misc out</span>
          <span>LKR {formatLKR(row.miscOut)}</span>
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
            value === "income" ? "Income (Client Payments)" : "Outgoing (Suppliers + Misc)"
          }
        />
        <Bar dataKey="income" fill="#059669" radius={[4, 4, 0, 0]} />
        <Bar dataKey="outgoing" fill="#e11d48" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
