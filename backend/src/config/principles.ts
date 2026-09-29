import type { RubricCategoryId } from '@lucida/shared';

/**
 * The learning-science principle registry (Technical Design §4.3).
 *
 * Every Expert Agent critique must name one of these ids. That constraint is
 * what makes suggestions source-traceable rather than folk pedagogy: an
 * unregistered principle is rejected by the QA pass, so the agent cannot invent
 * a plausible-sounding rule and present it as research.
 */
export interface Principle {
  id: string;
  name: string;
  /** One-line statement the agent reasons against. */
  statement: string;
  source: string;
}

export const PRINCIPLES: Principle[] = [
  {
    id: 'cognitive-load',
    name: 'Cognitive Load Theory',
    statement:
      'Working memory holds only a few novel elements at once. Extraneous load — unnecessary terms, split attention between sources, decorative detail — crowds out the germane load that actually builds understanding.',
    source: 'Sweller, J. — Cognitive Load Theory (foundational and ongoing work)',
  },
  {
    id: 'retrieval-practice',
    name: 'Retrieval Practice',
    statement:
      'Actively recalling information strengthens retention far more than re-reading or re-encountering it. Low-stakes recall opportunities beat additional exposure.',
    source:
      'Roediger, H. L., & Karpicke, J. D. (2006). The power of testing memory. Perspectives on Psychological Science, 1(3), 181-210',
  },
  {
    id: 'spaced-practice',
    name: 'Spaced Practice',
    statement:
      'Distributing practice across separate sessions produces better long-term retention than massing the same total practice into one sitting.',
    source: 'Roediger & Karpicke (2006); Cepeda et al. distributed-practice literature',
  },
  {
    id: 'expertise-reversal',
    name: 'Expertise Reversal Effect',
    statement:
      'Scaffolding that helps a novice actively harms a learner who already knows the material — worked examples and heavy guidance become redundant load for them.',
    source: 'Kalyuga, S. et al. — expertise reversal effect (foundational and ongoing work)',
  },
  {
    id: 'multimedia',
    name: 'Multimedia Principle',
    statement:
      'People learn better from words and pictures together than from words alone, provided the two are integrated rather than presented separately.',
    source: 'Mayer, R. E. — Cognitive Theory of Multimedia Learning (2021/2024 editions)',
  },
  {
    id: 'coherence',
    name: 'Coherence Principle',
    statement:
      'Interesting-but-irrelevant material depresses learning. Every element that does not serve the objective competes with the ones that do.',
    source: 'Mayer, R. E. — Cognitive Theory of Multimedia Learning',
  },
  {
    id: 'signaling',
    name: 'Signaling Principle',
    statement:
      'Explicit cues about structure and what matters most — headings, stated objectives, highlighting the key relationship — improve learning from the same content.',
    source: 'Mayer, R. E. — Cognitive Theory of Multimedia Learning',
  },
  {
    id: 'redundancy',
    name: 'Redundancy Principle',
    statement:
      'Presenting the same information simultaneously in two full forms (e.g. narrated text read verbatim off a slide) hurts rather than helps.',
    source: 'Mayer, R. E. — Cognitive Theory of Multimedia Learning',
  },
  {
    id: 'misconception-correction',
    name: 'Explicit Misconception Correction',
    statement:
      'Prior misconceptions persist unless directly surfaced and contradicted. Presenting only the correct account leaves the incorrect one intact alongside it.',
    source:
      'Muller, D. A. (2008). Designing effective multimedia for physics education (Doctoral dissertation, University of Sydney) — found that videos explicitly presenting and refuting a common misconception produced better learning than straightforward, misconception-free exposition',
  },
  {
    id: 'growth-mindset-framing',
    name: 'Growth Mindset Framing',
    statement:
      'Framing difficulty as evidence of learning rather than of fixed ability affects persistence, particularly for students who already doubt their competence in the subject.',
    source: 'Dweck, C. S. — growth vs. fixed mindset (foundational and ongoing work)',
  },
  {
    id: 'worked-examples',
    name: 'Worked Example Effect',
    statement:
      'For novices, studying a fully worked example before attempting a problem produces better learning than problem-solving from the start.',
    source: 'Sweller, J., & Cooper, G. — worked example effect',
  },
];

export const PRINCIPLE_IDS = PRINCIPLES.map((p) => p.id);

export function getPrinciple(id: string): Principle | undefined {
  return PRINCIPLES.find((p) => p.id === id);
}

/**
 * Which rubric category (Technical Design §4.10) a principle's critiques roll
 * up into, so the drill-down can show *why* a category scored the way it did
 * by finding the critiques that justify it — without asking the agent to
 * redundantly restate the link. `coherence`, `signaling`, and `redundancy`
 * all map to Cognitive Load because Mayer treats them as ways of managing
 * extraneous processing load, the same rationale the rubric itself uses to
 * merge Coherence into Cognitive Load rather than giving it its own row.
 *
 * `growth-mindset-framing` is deliberately absent: it doesn't fit cognitive
 * load, visuals, or the active-practice/scaffolding family that Teaching
 * Approach covers, and forcing a mapping would be arbitrary. Its critiques
 * still appear in the per-chunk critique list — they just don't roll up into
 * a scored rubric row.
 */
export const PRINCIPLE_RUBRIC_CATEGORY: Partial<Record<string, RubricCategoryId>> = {
  'cognitive-load': 'cognitiveLoad',
  coherence: 'cognitiveLoad',
  signaling: 'cognitiveLoad',
  redundancy: 'cognitiveLoad',
  multimedia: 'visuals',
  'retrieval-practice': 'teachingApproach',
  'spaced-practice': 'teachingApproach',
  'misconception-correction': 'teachingApproach',
  'expertise-reversal': 'teachingApproach',
  'worked-examples': 'teachingApproach',
};

/** Compact block injected into the Expert Agent prompt. */
export function principlesPromptBlock(): string {
  return PRINCIPLES.map((p) => `- ${p.id} (${p.name}): ${p.statement}`).join('\n');
}
