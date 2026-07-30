import type { Chunk, ChunkHeatmapCell } from "@lucida/shared";
import { heatColor } from "../lib/color.js";

export default function ChunkCard({
  chunk,
  heatmapByTier,
  selected,
  onSelect,
}: {
  chunk: Chunk;
  heatmapByTier: ChunkHeatmapCell[];
  selected: boolean;
  onSelect: () => void;
}) {
  const cellsForChunk = heatmapByTier.filter((c) => c.chunkId === chunk.id);
  const avgRate =
    cellsForChunk.length > 0
      ? cellsForChunk.reduce((sum, c) => sum + c.comprehensionRate, 0) / cellsForChunk.length
      : 0;

  return (
    <button
      onClick={onSelect}
      className={`flex min-w-[9rem] flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
        selected ? "border-slate-500 bg-slate-800" : "border-slate-800 bg-slate-900 hover:border-slate-700"
      }`}
    >
      <span className="text-xs text-slate-500">Chunk {chunk.order + 1}</span>
      <span className="truncate text-sm font-medium text-slate-200">{chunk.label}</span>
      <span className="text-xs font-medium" style={{ color: heatColor(avgRate) }}>
        {Math.round(avgRate * 100)}% comprehension
      </span>
    </button>
  );
}
