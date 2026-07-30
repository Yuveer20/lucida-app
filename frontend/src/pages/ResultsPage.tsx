import { useState } from "react";
import type { AssessResponse } from "@lucida/shared";
import ComprehensionPieChart from "../components/ComprehensionPieChart.js";
import TierBreakdown from "../components/TierBreakdown.js";
import StyleBreakdown from "../components/StyleBreakdown.js";
import ChunkHeatmap from "../components/ChunkHeatmap.js";
import ChunkCard from "../components/ChunkCard.js";
import ChunkDrillDown from "../components/ChunkDrillDown.js";
import ImprovementSuggestions from "../components/ImprovementSuggestions.js";

export default function ResultsPage({ data, onReset }: { data: AssessResponse; onReset: () => void }) {
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(data.chunks[0]?.id ?? null);
  const selectedChunk = data.chunks.find((c) => c.id === selectedChunkId) ?? null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Assessment results</h1>
        <button
          onClick={onReset}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          New assessment
        </button>
      </div>

      {data.partialFailures.length > 0 && (
        <p className="rounded-md border border-amber-900 bg-amber-950/50 p-3 text-xs text-amber-400">
          {data.partialFailures.length} of 16 student archetypes failed to simulate and were excluded from these
          results.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ComprehensionPieChart overallComprehensionRate={data.overallComprehensionRate} />
        <TierBreakdown tierBreakdown={data.tierBreakdown} />
        <StyleBreakdown styleBreakdown={data.styleBreakdown} />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {data.chunks.map((chunk) => (
          <ChunkCard
            key={chunk.id}
            chunk={chunk}
            heatmapByTier={data.heatmapByTier}
            selected={chunk.id === selectedChunkId}
            onSelect={() => setSelectedChunkId(chunk.id)}
          />
        ))}
      </div>

      <ChunkHeatmap
        chunks={data.chunks}
        heatmapByTier={data.heatmapByTier}
        heatmapByStyle={data.heatmapByStyle}
        selectedChunkId={selectedChunkId}
        onSelectChunk={setSelectedChunkId}
      />

      {selectedChunk && (
        <ChunkDrillDown chunk={selectedChunk} results={data.chunkDrillDowns[selectedChunk.id] ?? []} />
      )}

      <ImprovementSuggestions suggestions={data.suggestions} chunks={data.chunks} />
    </div>
  );
}
