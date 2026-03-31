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

interface ThroughputData {
  label: string;
  husksReceived: number;
  outputProduced: number;
}

export function ThroughputChart({ data }: { data: ThroughputData[] }) {
  if (data.every((d) => d.husksReceived === 0 && d.outputProduced === 0)) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No throughput data yet
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip
          formatter={(value, name) => [
            Number(value).toLocaleString(),
            name === "husksReceived" ? "Husks Received" : "Output (kg)",
          ]}
        />
        <Legend
          formatter={(value: string) =>
            value === "husksReceived" ? "Husks Received" : "Output Produced (kg)"
          }
        />
        <Bar dataKey="husksReceived" fill="#059669" radius={[4, 4, 0, 0]} />
        <Bar dataKey="outputProduced" fill="#0284c7" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
