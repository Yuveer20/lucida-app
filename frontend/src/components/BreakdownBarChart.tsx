import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLOR_GRIDLINE, COLOR_MUTED_TEXT, heatColor } from "../lib/color.js";

export interface BreakdownDatum {
  label: string;
  rate: number;
}

export default function BreakdownBarChart({ title, data }: { title: string; data: BreakdownDatum[] }) {
  const chartData = data.map((d) => ({ ...d, pct: Math.round(d.rate * 100) }));

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="mb-2 text-sm font-medium text-slate-300">{title}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={COLOR_GRIDLINE} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: COLOR_MUTED_TEXT, fontSize: 12 }} unit="%" />
            <YAxis type="category" dataKey="label" width={110} tick={{ fill: COLOR_MUTED_TEXT, fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "#1a1a19", border: "1px solid #2c2c2a", borderRadius: 6 }}
              itemStyle={{ color: "#ffffff" }}
              formatter={(value: number) => [`${value}%`, "Comprehension"]}
            />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
              {chartData.map((d) => (
                <Cell key={d.label} fill={heatColor(d.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
