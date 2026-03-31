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
  Cell,
} from "recharts";

interface BatchProfit {
  batchNumber: string;
  rawMaterialCost: number;
  revenue: number;
  profit: number;
}

export function ProfitabilityChart({ data }: { data: BatchProfit[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No profitability data yet
      </p>
    );
  }

  // Show most recent 10
  const chartData = data.slice(0, 10).reverse();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="batchNumber"
          fontSize={10}
          angle={-30}
          textAnchor="end"
          height={60}
        />
        <YAxis fontSize={12} />
        <Tooltip
          formatter={(value, name) => [
            `LKR ${Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`,
            name === "rawMaterialCost"
              ? "Raw Material Cost"
              : name === "revenue"
              ? "Revenue"
              : "Profit",
          ]}
        />
        <Legend
          formatter={(value: string) =>
            value === "rawMaterialCost"
              ? "Cost"
              : value === "revenue"
              ? "Revenue"
              : "Profit"
          }
        />
        <Bar dataKey="rawMaterialCost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.profit >= 0 ? "#0284c7" : "#dc2626"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
