import { ACADEMIC_TIERS, LEARNING_STYLES, WEAK_CHUNK_THRESHOLD, buildArchetypes } from "../config/personas.js";
import type {
  AcademicTierId,
  Archetype,
  AssessResponse,
  Chunk,
  ChunkHeatmapCell,
  LearningStyleId,
  LessonPlan,
  PersonaResult,
  Suggestion,
} from "@lucida/shared";

function normalizedWeights<T extends { id: string; weight: number }>(items: T[]): Map<string, number> {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.id, total > 0 ? item.weight / total : 0);
  }
  return map;
}

/** understood(archetype, chunk) as a 0/1 score, for a single chunk. */
function understoodScore(results: PersonaResult[], archetypeId: string, chunkId: string): number | null {
  const result = results.find((r) => r.archetypeId === archetypeId && r.chunkId === chunkId);
  return result ? (result.understood ? 1 : 0) : null;
}

function weightedAverage(entries: Array<{ weight: number; value: number | null }>): number {
  const usable = entries.filter((e): e is { weight: number; value: number } => e.value !== null);
  const totalWeight = usable.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight === 0) return 0;
  return usable.reduce((sum, e) => sum + e.weight * e.value, 0) / totalWeight;
}

export function aggregate(
  lessonPlan: LessonPlan,
  chunks: Chunk[],
  personaResults: PersonaResult[],
  partialFailures: string[]
): AssessResponse {
  const allArchetypes = buildArchetypes();
  const archetypes = allArchetypes.filter((a) => !partialFailures.includes(a.id));
  const archetypeWeights = normalizedWeights(archetypes);

  // Per-chunk, per-archetype comprehension (0/1), used for both breakdowns and heatmap.
  const perChunkByArchetype = (chunkId: string, archetypesForAxis: Archetype[]) =>
    archetypesForAxis.map((a) => ({
      weight: archetypeWeights.get(a.id) ?? 0,
      value: understoodScore(personaResults, a.id, chunkId),
    }));

  // Overall: average across chunks of the population-weighted comprehension rate for that chunk.
  const perChunkOverallRates = chunks.map((chunk) =>
    weightedAverage(perChunkByArchetype(chunk.id, archetypes))
  );
  const overallComprehensionRate =
    perChunkOverallRates.length > 0
      ? perChunkOverallRates.reduce((a, b) => a + b, 0) / perChunkOverallRates.length
      : 0;

  // Tier/style breakdown: an archetype's lesson-level rate is its mean comprehension across chunks,
  // then tier/style buckets average across the collapsed axis using that axis's normalized weights.
  const archetypeLessonRate = new Map<string, number>();
  for (const archetype of archetypes) {
    const rates = chunks
      .map((c) => understoodScore(personaResults, archetype.id, c.id))
      .filter((v): v is number => v !== null);
    archetypeLessonRate.set(
      archetype.id,
      rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
    );
  }

  const styleWeights = normalizedWeights(LEARNING_STYLES);
  const tierWeights = normalizedWeights(ACADEMIC_TIERS);

  const tierBreakdown = {} as Record<AcademicTierId, number>;
  for (const tier of ACADEMIC_TIERS) {
    const entries = LEARNING_STYLES.map((style) => {
      const archetype = archetypes.find((a) => a.tier === tier.id && a.style === style.id);
      return {
        weight: styleWeights.get(style.id) ?? 0,
        value: archetype ? archetypeLessonRate.get(archetype.id) ?? null : null,
      };
    });
    tierBreakdown[tier.id] = weightedAverage(entries);
  }

  const styleBreakdown = {} as Record<LearningStyleId, number>;
  for (const style of LEARNING_STYLES) {
    const entries = ACADEMIC_TIERS.map((tier) => {
      const archetype = archetypes.find((a) => a.tier === tier.id && a.style === style.id);
      return {
        weight: tierWeights.get(tier.id) ?? 0,
        value: archetype ? archetypeLessonRate.get(archetype.id) ?? null : null,
      };
    });
    styleBreakdown[style.id] = weightedAverage(entries);
  }

  // Heatmap: chunk x tier and chunk x style, each cell a single chunk's rate for that group.
  const heatmapByTier: ChunkHeatmapCell[] = [];
  const heatmapByStyle: ChunkHeatmapCell[] = [];
  for (const chunk of chunks) {
    for (const tier of ACADEMIC_TIERS) {
      const entries = LEARNING_STYLES.map((style) => {
        const archetype = archetypes.find((a) => a.tier === tier.id && a.style === style.id);
        return {
          weight: styleWeights.get(style.id) ?? 0,
          value: archetype ? understoodScore(personaResults, archetype.id, chunk.id) : null,
        };
      });
      heatmapByTier.push({ chunkId: chunk.id, groupId: tier.id, comprehensionRate: weightedAverage(entries) });
    }
    for (const style of LEARNING_STYLES) {
      const entries = ACADEMIC_TIERS.map((tier) => {
        const archetype = archetypes.find((a) => a.tier === tier.id && a.style === style.id);
        return {
          weight: tierWeights.get(tier.id) ?? 0,
          value: archetype ? understoodScore(personaResults, archetype.id, chunk.id) : null,
        };
      });
      heatmapByStyle.push({ chunkId: chunk.id, groupId: style.id, comprehensionRate: weightedAverage(entries) });
    }
  }

  // Chunk drill-down: full 16-archetype detail per chunk (from all attempted archetypes, including
  // any that partially failed elsewhere but succeeded for this chunk — in practice a whole archetype
  // either succeeds or fails since it's one call per archetype for all chunks).
  const chunkDrillDowns: Record<string, PersonaResult[]> = {};
  for (const chunk of chunks) {
    chunkDrillDowns[chunk.id] = personaResults.filter((r) => r.chunkId === chunk.id);
  }

  // Suggestions: derived deterministically from stuck points already collected, for any chunk
  // whose aggregate rate falls below the weak-chunk threshold. No additional LLM call.
  const suggestions: Suggestion[] = [];
  chunks.forEach((chunk, index) => {
    if (perChunkOverallRates[index] >= WEAK_CHUNK_THRESHOLD) return;
    const stuckPoints = (chunkDrillDowns[chunk.id] ?? [])
      .map((r) => r.stuckPoint)
      .filter((s): s is string => Boolean(s));
    if (stuckPoints.length === 0) return;

    const counts = new Map<string, number>();
    for (const point of stuckPoints) counts.set(point, (counts.get(point) ?? 0) + 1);
    const [topStuckPoint] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

    suggestions.push({
      chunkId: chunk.id,
      text: `Multiple simulated students struggled with: "${topStuckPoint}". Consider adding a concrete example, visual aid, or hands-on activity to bridge this gap in "${chunk.label}".`,
    });
  });

  return {
    lessonPlan,
    chunks,
    overallComprehensionRate,
    tierBreakdown,
    styleBreakdown,
    heatmapByTier,
    heatmapByStyle,
    chunkDrillDowns,
    suggestions,
    partialFailures,
  };
}
