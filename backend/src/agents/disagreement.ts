import type { Disagreement, ExpertAgentCritique, TeacherAgentCritique } from '@lucida/shared';

/**
 * Disagreement surfacing (Technical Design §4.4).
 *
 * Detected deterministically rather than by asking a model "do these conflict?".
 * Both agents already tag each critique with a stance, so a chunk where one
 * says "works" and the other says "concern" is a conflict by construction —
 * no extra call, no judgement, and no risk of the merge the product
 * specifically exists to avoid.
 */
export function findDisagreements(
  teacherCritiques: TeacherAgentCritique[],
  expertCritiques: ExpertAgentCritique[],
): Disagreement[] {
  const disagreements: Disagreement[] = [];
  let n = 0;

  const chunkIds = new Set(
    [...teacherCritiques, ...expertCritiques]
      .map((c) => c.chunkId)
      .filter((id): id is string => Boolean(id)),
  );

  for (const chunkId of chunkIds) {
    const teacher = teacherCritiques.filter((c) => c.chunkId === chunkId);
    const expert = expertCritiques.filter((c) => c.chunkId === chunkId);
    if (teacher.length === 0 || expert.length === 0) continue;

    for (const t of teacher) {
      const opposed = expert.find((e) => e.stance !== t.stance);
      if (!opposed) continue;

      disagreements.push({
        id: `dis-${++n}`,
        chunkId,
        teacherCritiqueId: t.id,
        expertCritiqueId: opposed.id,
        teacherView: t.critique,
        expertView: opposed.critique,
        note:
          t.stance === 'works'
            ? `The teacher would keep this as-is; the ${opposed.principle} reading says it costs comprehension. Both are shown because the tradeoff is real.`
            : `The ${opposed.principle} reading says this part is sound; the teacher's concern is whether it survives contact with a real period. Both are shown because the tradeoff is real.`,
      });
    }
  }

  return disagreements;
}
