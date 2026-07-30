import type { Chunk, PersonaResult } from "@lucida/shared";
import { STYLE_LABELS, TIER_LABELS } from "../lib/labels.js";
import { COLOR_STRUGGLING, COLOR_UNDERSTOOD } from "../lib/color.js";

function archetypeLabel(archetypeId: string): string {
  const [tier, ...styleParts] = archetypeId.split("_");
  const style = styleParts.join("_");
  const tierLabel = TIER_LABELS[tier as keyof typeof TIER_LABELS] ?? tier;
  const styleLabel = STYLE_LABELS[style as keyof typeof STYLE_LABELS] ?? style;
  return `${tierLabel} · ${styleLabel}`;
}

export default function ChunkDrillDown({ chunk, results }: { chunk: Chunk; results: PersonaResult[] }) {
  const sorted = [...results].sort((a, b) => a.confidence - b.confidence);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="mb-1 text-sm font-medium text-slate-300">Diagnosis: {chunk.label}</p>
      <p className="mb-4 text-xs text-slate-500">All 16 student archetypes for this chunk, weakest first.</p>

      <div className="flex flex-col gap-2">
        {sorted.map((r) => (
          <div key={r.archetypeId} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200">{archetypeLabel(r.archetypeId)}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-950"
                style={{ backgroundColor: r.understood ? COLOR_UNDERSTOOD : COLOR_STRUGGLING }}
              >
                {r.understood ? "Understood" : "Struggled"} · {Math.round(r.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-400">{r.reason}</p>
            {r.stuckPoint && <p className="mt-1 text-xs text-slate-500">Stuck on: {r.stuckPoint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
