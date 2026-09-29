import type { Persona } from '@lucida/shared';

/**
 * The Student Agent roster — 18 curated composite personas (PRD §5a).
 *
 * These are hand-designed bundles, NOT a cross product. A mechanical cross of
 * the ten dimensions would produce 500+ combinations, which is both
 * cost-prohibitive and less realistic: it would treat clearly correlated traits
 * (income and parental education; home language and measured reading level) as
 * independent, and would generate many combinations that do not occur in real
 * classrooms.
 *
 * Each entry below is a combination that actually co-occurs. Edit this file to
 * recalibrate the simulated classroom — nothing downstream hardcodes a persona
 * id, and Milestone 4's regional grounding is expected to rewrite this roster
 * from real district data rather than change pipeline code.
 */
export const PERSONAS: Persona[] = [
  {
    id: 'on-grade-steady',
    name: 'Steady on-grade generalist',
    description:
      'Reads at grade level, follows instructions, and finishes work without much prompting. Neither races ahead nor falls behind. Represents the middle of the room — if a chunk loses this student, it is losing most of the class.',
    dimensions: {
      tier: 'on-grade',
      priorKnowledge: 'moderate',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'at',
      attention: 'variable',
      motivation: 'moderate',
      resourceAccess: 'adequate',
      parentalEducation: 'some-college',
      homeLanguage: 'english',
      mindset: 'mixed',
    },
  },
  {
    id: 'struggling-reader-motivated',
    name: 'Struggling reader, high motivation',
    description:
      'Wants to do well and tries hard, but decoding dense text is slow and effortful. Gets stuck on vocabulary rather than on ideas — will understand a concept explained aloud that they could not extract from a paragraph. Short attention span compounds this: by the time they have parsed a sentence, they have lost the thread of the one before.',
    dimensions: {
      tier: 'below-grade',
      priorKnowledge: 'low',
      cognitiveLoadTolerance: 'low',
      readingLevel: 'below',
      attention: 'short',
      motivation: 'high',
      resourceAccess: 'adequate',
      parentalEducation: 'first-generation',
      homeLanguage: 'english',
      mindset: 'growth-leaning',
    },
  },
  {
    id: 'advanced-under-challenged',
    name: 'Advanced, under-challenged',
    description:
      'Already knows a good deal of this material. Scaffolding written for a novice actively slows them down and reads as condescending — the expertise reversal effect in action. Disengages when a chunk re-explains something they have understood since the first sentence.',
    dimensions: {
      tier: 'advanced',
      priorKnowledge: 'high',
      cognitiveLoadTolerance: 'high',
      readingLevel: 'above',
      attention: 'variable',
      motivation: 'low',
      resourceAccess: 'strong',
      parentalEducation: 'college-graduate',
      homeLanguage: 'english',
      mindset: 'fixed-leaning',
    },
  },
  {
    id: 'high-needs-limited-access',
    name: 'High-needs, limited resources',
    description:
      'Attends inconsistently and cannot count on a quiet place to work or a device at home. Anything a chunk assumes was done outside class — pre-reading, printing, looking something up — is a hard blocker rather than an inconvenience. In class, engages well when the work is self-contained.',
    dimensions: {
      tier: 'high-needs',
      priorKnowledge: 'low',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'below',
      attention: 'variable',
      motivation: 'moderate',
      resourceAccess: 'limited',
      parentalEducation: 'first-generation',
      homeLanguage: 'emerging-bilingual',
      mindset: 'mixed',
    },
  },
  {
    id: 'emerging-bilingual-capable',
    name: 'Emerging bilingual, strong reasoner',
    description:
      'Reasons at or above grade level but is still acquiring academic English. Handles the concept and stumbles on the wording — idioms, multi-clause sentences, and unglossed technical terms are the barrier, not the ideas. Reading-level signals understate this student badly.',
    dimensions: {
      tier: 'on-grade',
      priorKnowledge: 'moderate',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'below',
      attention: 'sustained',
      motivation: 'high',
      resourceAccess: 'adequate',
      parentalEducation: 'first-generation',
      homeLanguage: 'emerging-bilingual',
      mindset: 'growth-leaning',
    },
  },
  {
    id: 'quiet-overloaded',
    name: 'Quiet, easily overloaded',
    description:
      'Attentive and compliant, so their confusion is invisible — they will not interrupt to say they are lost. Working memory fills quickly: more than two or three new elements held at once and comprehension collapses silently. Tends to blame themselves rather than the explanation.',
    dimensions: {
      tier: 'on-grade',
      priorKnowledge: 'low',
      cognitiveLoadTolerance: 'low',
      readingLevel: 'at',
      attention: 'sustained',
      motivation: 'moderate',
      resourceAccess: 'adequate',
      parentalEducation: 'some-college',
      homeLanguage: 'english',
      mindset: 'fixed-leaning',
    },
  },
  {
    id: 'distracted-capable',
    name: 'Capable but distractible',
    description:
      'Grasps material quickly when actually attending, which is perhaps half the time. Long uninterrupted stretches of teacher talk lose them entirely; anything requiring a response every few minutes keeps them in the room. Not a comprehension problem — an attention-architecture problem.',
    dimensions: {
      tier: 'on-grade',
      priorKnowledge: 'moderate',
      cognitiveLoadTolerance: 'high',
      readingLevel: 'at',
      attention: 'short',
      motivation: 'moderate',
      resourceAccess: 'adequate',
      parentalEducation: 'college-graduate',
      homeLanguage: 'english',
      mindset: 'mixed',
    },
  },
  {
    id: 'first-gen-high-achiever',
    name: 'First-generation high achiever',
    description:
      'Ambitious and self-directed, with no one at home who can help with the content. Reads instructions closely and takes them literally — ambiguity in a task description costs them real time because they have no one to check with. Thrives on explicit success criteria.',
    dimensions: {
      tier: 'advanced',
      priorKnowledge: 'moderate',
      cognitiveLoadTolerance: 'high',
      readingLevel: 'above',
      attention: 'sustained',
      motivation: 'high',
      resourceAccess: 'adequate',
      parentalEducation: 'first-generation',
      homeLanguage: 'english',
      mindset: 'growth-leaning',
    },
  },
  {
    id: 'missed-prerequisite',
    name: 'Missed the prerequisite unit',
    description:
      'Otherwise a solid student who was absent for, or never covered, the material this lesson builds on. Every chunk that says "as we saw last week" or assumes a definition is already known opens a gap that widens for the rest of the lesson.',
    dimensions: {
      tier: 'on-grade',
      priorKnowledge: 'none',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'at',
      attention: 'sustained',
      motivation: 'moderate',
      resourceAccess: 'adequate',
      parentalEducation: 'some-college',
      homeLanguage: 'english',
      mindset: 'mixed',
    },
  },
  {
    id: 'proficient-bilingual-confident',
    name: 'Proficient bilingual, confident',
    description:
      'Fully fluent in academic English alongside another home language. Occasionally trips on culturally specific examples or idioms used as load-bearing explanation, but otherwise performs as a solid on-grade student and often notices ambiguity others miss.',
    dimensions: {
      tier: 'on-grade',
      priorKnowledge: 'moderate',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'at',
      attention: 'sustained',
      motivation: 'high',
      resourceAccess: 'adequate',
      parentalEducation: 'college-graduate',
      homeLanguage: 'proficient-bilingual',
      mindset: 'growth-leaning',
    },
  },
  {
    id: 'disengaged-below-grade',
    name: 'Below grade, disengaged',
    description:
      'The hardest student in the room to reach. Has decided they are "not a science person" and reads early difficulty as confirmation. Will stop trying at the first chunk that feels impenetrable and will not recover later in the lesson unless something explicitly pulls them back.',
    dimensions: {
      tier: 'below-grade',
      priorKnowledge: 'low',
      cognitiveLoadTolerance: 'low',
      readingLevel: 'below',
      attention: 'short',
      motivation: 'low',
      resourceAccess: 'limited',
      parentalEducation: 'first-generation',
      homeLanguage: 'english',
      mindset: 'fixed-leaning',
    },
  },
  {
    id: 'strong-reader-weak-recall',
    name: 'Strong reader, weak retention',
    description:
      'Reads fluently and appears to understand in the moment, then cannot reproduce any of it the next day. Passive re-reading feels productive to them and is not. Benefits disproportionately from any chunk that requires actively recalling rather than re-encountering.',
    dimensions: {
      tier: 'on-grade',
      priorKnowledge: 'low',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'above',
      attention: 'variable',
      motivation: 'moderate',
      resourceAccess: 'strong',
      parentalEducation: 'college-graduate',
      homeLanguage: 'english',
      mindset: 'mixed',
    },
  },
  {
    id: 'anxious-perfectionist',
    name: 'Anxious perfectionist',
    description:
      'High-achieving and highly motivated, but treats every error as evidence of inadequacy. Freezes on open-ended tasks with unclear success criteria and on anything graded that is presented without warning. Needs to know what "done correctly" looks like before starting.',
    dimensions: {
      tier: 'advanced',
      priorKnowledge: 'moderate',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'above',
      attention: 'sustained',
      motivation: 'high',
      resourceAccess: 'strong',
      parentalEducation: 'college-graduate',
      homeLanguage: 'english',
      mindset: 'fixed-leaning',
    },
  },
  {
    id: 'pragmatic-minimalist',
    name: 'Pragmatic minimalist',
    description:
      'Does exactly what is asked and nothing more. Will not infer an unstated expectation, will not go beyond the letter of a task, and will skip anything optional. A useful probe for whether a chunk states its requirements explicitly enough to be followed literally.',
    dimensions: {
      tier: 'on-grade',
      priorKnowledge: 'moderate',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'at',
      attention: 'sustained',
      motivation: 'low',
      resourceAccess: 'adequate',
      parentalEducation: 'some-college',
      homeLanguage: 'english',
      mindset: 'mixed',
    },
  },
  {
    id: 'high-needs-resilient',
    name: 'High-needs, resilient',
    description:
      'Faces real instability outside school and shows up anyway. Attention fluctuates with what is happening at home, so retention across days is unreliable, but in-class engagement is genuine. Anything that recaps rather than assumes continuity helps this student most.',
    dimensions: {
      tier: 'high-needs',
      priorKnowledge: 'low',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'at',
      attention: 'variable',
      motivation: 'high',
      resourceAccess: 'limited',
      parentalEducation: 'first-generation',
      homeLanguage: 'english',
      mindset: 'growth-leaning',
    },
  },
  {
    id: 'advanced-fast-processor',
    name: 'Advanced fast processor',
    description:
      'Absorbs new material at roughly twice the pace of the lesson and finishes every task early. The risk is not comprehension but dead time: chunks with no extension path leave this student idle and, eventually, disruptive.',
    dimensions: {
      tier: 'advanced',
      priorKnowledge: 'high',
      cognitiveLoadTolerance: 'high',
      readingLevel: 'above',
      attention: 'sustained',
      motivation: 'moderate',
      resourceAccess: 'strong',
      parentalEducation: 'college-graduate',
      homeLanguage: 'english',
      mindset: 'growth-leaning',
    },
  },
  {
    id: 'emerging-bilingual-newcomer',
    name: 'Emerging bilingual newcomer',
    description:
      'Recently arrived and early in English acquisition, with strong prior schooling in another language. Depends on visual support, cognates, and concrete examples. Text-only explanation of an abstract idea is close to inaccessible; the same idea shown concretely lands quickly.',
    dimensions: {
      tier: 'high-needs',
      priorKnowledge: 'moderate',
      cognitiveLoadTolerance: 'low',
      readingLevel: 'below',
      attention: 'sustained',
      motivation: 'high',
      resourceAccess: 'limited',
      parentalEducation: 'some-college',
      homeLanguage: 'emerging-bilingual',
      mindset: 'growth-leaning',
    },
  },
  {
    id: 'social-learner',
    name: 'Social learner',
    description:
      'Thinks by talking. Understanding consolidates during discussion and pair work and stays fuzzy through silent independent reading. Engaged and motivated when there is someone to talk to, drifts when there is not.',
    dimensions: {
      tier: 'on-grade',
      priorKnowledge: 'moderate',
      cognitiveLoadTolerance: 'moderate',
      readingLevel: 'at',
      attention: 'variable',
      motivation: 'high',
      resourceAccess: 'adequate',
      parentalEducation: 'some-college',
      homeLanguage: 'proficient-bilingual',
      mindset: 'growth-leaning',
    },
  },
];

export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}
