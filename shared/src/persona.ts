/**
 * The ten evidence-backed Student Agent dimensions (Technical Design §4.1).
 *
 * Ethnicity and gender are deliberately absent — neither has credible evidence
 * as a predictor of comprehension, and including either would require the model
 * to fabricate an outcome pattern with no evidentiary basis. Content-level
 * effects sometimes associated with those categories (e.g. stereotype threat
 * from how a chunk is framed) belong to the Expert Agent's critique of the
 * lesson, not to a simulated student's traits.
 */

export const DIMENSION_IDS = [
  'tier',
  'priorKnowledge',
  'cognitiveLoadTolerance',
  'readingLevel',
  'attention',
  'motivation',
  'resourceAccess',
  'parentalEducation',
  'homeLanguage',
  'mindset',
] as const;

export type DimensionId = (typeof DIMENSION_IDS)[number];

export type Tier = 'below-grade' | 'on-grade' | 'advanced' | 'high-needs';
export type PriorKnowledge = 'none' | 'low' | 'moderate' | 'high';
export type CognitiveLoadTolerance = 'low' | 'moderate' | 'high';
export type ReadingLevel = 'below' | 'at' | 'above';
export type Attention = 'short' | 'variable' | 'sustained';
export type Motivation = 'low' | 'moderate' | 'high';
export type ResourceAccess = 'limited' | 'adequate' | 'strong';
export type ParentalEducation = 'first-generation' | 'some-college' | 'college-graduate';
export type HomeLanguage = 'english' | 'emerging-bilingual' | 'proficient-bilingual';
export type Mindset = 'fixed-leaning' | 'mixed' | 'growth-leaning';

export interface PersonaDimensions {
  tier: Tier;
  priorKnowledge: PriorKnowledge;
  cognitiveLoadTolerance: CognitiveLoadTolerance;
  readingLevel: ReadingLevel;
  attention: Attention;
  motivation: Motivation;
  resourceAccess: ResourceAccess;
  parentalEducation: ParentalEducation;
  homeLanguage: HomeLanguage;
  mindset: Mindset;
}

/**
 * A curated composite persona — a realistic, internally-consistent bundle
 * across all ten dimensions, rather than one cell of a mechanical cross
 * product (PRD §5a).
 */
export interface Persona {
  id: string;
  /** Short display name, e.g. "Struggling reader, high motivation". */
  name: string;
  /** Prose the Student Agent prompt is built from. */
  description: string;
  dimensions: PersonaDimensions;
}

/** Human-readable labels for the dimension toggle in the results UI. */
export const DIMENSION_LABELS: Record<DimensionId, string> = {
  tier: 'Academic tier',
  priorKnowledge: 'Prior knowledge',
  cognitiveLoadTolerance: 'Cognitive load',
  readingLevel: 'Reading level',
  attention: 'Attention span',
  motivation: 'Motivation',
  resourceAccess: 'Resource access',
  parentalEducation: 'Parental education',
  homeLanguage: 'Home language',
  mindset: 'Mindset',
};
