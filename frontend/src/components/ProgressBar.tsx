import { useEffect, useState } from "react";

const ARCHETYPE_COUNT = 16;
const PHASES = ["Analyzing lesson structure", "Simulating 500 students"];

export default function ProgressBar() {
  const [progress, setProgress] = useState(2);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [activeCell, setActiveCell] = useState(0);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 2 : p));
    }, 300);
    const phaseTimer = setTimeout(() => setPhaseIndex(1), 2000);
    const cellTimer = setInterval(() => {
      setActiveCell((c) => (c + 1) % ARCHETYPE_COUNT);
    }, 400);
    return () => {
      clearInterval(progressTimer);
      clearTimeout(phaseTimer);
      clearInterval(cellTimer);
    };
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div>
        <div className="mb-2 flex justify-between text-sm text-slate-400">
          <span>{PHASES[phaseIndex]}...</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-slate-200 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: ARCHETYPE_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`h-8 rounded-md border transition-colors ${
              i === activeCell
                ? "border-slate-400 bg-slate-700"
                : i < activeCell
                  ? "border-slate-700 bg-slate-800"
                  : "border-slate-800 bg-slate-900"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
