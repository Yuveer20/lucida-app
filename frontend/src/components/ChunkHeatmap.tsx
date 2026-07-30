import { useState } from "react";
import type { Chunk, ChunkHeatmapCell } from "@lucida/shared";
import { STYLE_LABELS, STYLE_ORDER, TIER_LABELS, TIER_ORDER } from "../lib/labels.js";
import { heatColor } from "../lib/color.js";

type Axis = "tier" | "style";

export default function ChunkHeatmap({
  chunks,
  heatmapByTier,
  heatmapByStyle,
  selectedChunkId,
  onSelectChunk,
}: {
  chunks: Chunk[];
  heatmapByTier: ChunkHeatmapCell[];
  heatmapByStyle: ChunkHeatmapCell[];
  selectedChunkId: string | null;
  onSelectChunk: (chunkId: string) => void;
}) {
  const [axis, setAxis] = useState<Axis>("tier");
  const columns: string[] = axis === "tier" ? TIER_ORDER : STYLE_ORDER;
  const labels: Record<string, string> = axis === "tier" ? TIER_LABELS : STYLE_LABELS;
  const cells = axis === "tier" ? heatmapByTier : heatmapByStyle;

  const cellFor = (chunkId: string, groupId: string) =>
    cells.find((c) => c.chunkId === chunkId && c.groupId === groupId);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-300">Comprehension by chunk</p>
        <div className="flex overflow-hidden rounded-md border border-slate-700 text-xs">
          <button
            className={`px-2.5 py-1 ${axis === "tier" ? "bg-slate-700 text-slate-100" : "bg-slate-900 text-slate-400"}`}
            onClick={() => setAxis("tier")}
          >
            By tier
          </button>
          <button
            className={`px-2.5 py-1 ${axis === "style" ? "bg-slate-700 text-slate-100" : "bg-slate-900 text-slate-400"}`}
            onClick={() => setAxis("style")}
          >
            By style
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="text-left font-normal text-slate-500">Chunk</th>
              {columns.map((col) => (
                <th key={col} className="px-1 pb-1 text-center font-normal text-slate-500">
                  {labels[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chunks.map((chunk) => (
              <tr key={chunk.id}>
                <td
                  className={`max-w-[10rem] cursor-pointer truncate rounded-md px-2 py-1 text-slate-300 hover:text-slate-100 ${
                    selectedChunkId === chunk.id ? "bg-slate-800" : ""
                  }`}
                  onClick={() => onSelectChunk(chunk.id)}
                  title={chunk.label}
                >
                  {chunk.label}
                </td>
                {columns.map((col) => {
                  const cell = cellFor(chunk.id, col);
                  const rate = cell?.comprehensionRate ?? 0;
                  return (
                    <td key={col} className="p-0">
                      <button
                        className="flex h-9 w-14 items-center justify-center rounded-md text-[11px] font-medium text-slate-950"
                        style={{ backgroundColor: heatColor(rate) }}
                        onClick={() => onSelectChunk(chunk.id)}
                        title={`${chunk.label} — ${labels[col]}: ${Math.round(rate * 100)}%`}
                      >
                        {Math.round(rate * 100)}%
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">Click a chunk to see the full per-archetype diagnosis below.</p>
    </div>
  );
}
