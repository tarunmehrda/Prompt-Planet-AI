"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartPoint {
  label: string;
  value: number;
}

interface Props {
  data: ChartPoint[];
  color: string;
  unit: string;
}

export default function UsageChart({ data, color, unit }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(9,13,24,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            color: "#e8eefc",
            fontSize: 12,
          }}
          labelStyle={{ color: "#93a4c3" }}
          formatter={(v) => [`${v} ${unit}`, ""] as [string, string]}
          cursor={{ stroke: color, strokeOpacity: 0.4 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill="url(#fillArea)"
          dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
