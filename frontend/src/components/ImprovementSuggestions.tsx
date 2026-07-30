import type { Chunk, Suggestion } from "@lucida/shared";

export default function ImprovementSuggestions({
  suggestions,
  chunks,
}: {
  suggestions: Suggestion[];
  chunks: Chunk[];
}) {
  if (suggestions.length === 0) return null;
  const labelFor = (chunkId: string) => chunks.find((c) => c.id === chunkId)?.label ?? chunkId;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="mb-3 text-sm font-medium text-slate-300">Suggested revisions</p>
      <ul className="flex flex-col gap-3">
        {suggestions.map((s) => (
          <li key={s.chunkId} className="text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              {labelFor(s.chunkId)}
            </span>
            <span className="text-slate-300">{s.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
