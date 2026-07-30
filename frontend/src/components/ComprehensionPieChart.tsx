import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { COLOR_STRUGGLING, COLOR_UNDERSTOOD } from "../lib/color.js";

export default function ComprehensionPieChart({ overallComprehensionRate }: { overallComprehensionRate: number }) {
  const understoodPct = Math.round(overallComprehensionRate * 100);
  const data = [
    { name: "Understood", value: understoodPct, color: COLOR_UNDERSTOOD },
    { name: "Did not understand", value: 100 - understoodPct, color: COLOR_STRUGGLING },
  ];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="mb-2 text-sm font-medium text-slate-300">Overall comprehension</p>
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={2} stroke="none">
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#1a1a19", border: "1px solid #2c2c2a", borderRadius: 6 }}
              itemStyle={{ color: "#ffffff" }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: "#c3c2b7", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-semibold text-slate-100">{understoodPct}%</span>
        </div>
      </div>
    </div>
  );
}
