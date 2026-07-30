import type { AcademicTierId, LearningStyleId, Archetype } from "@lucida/shared";

export interface TierConfig {
  id: AcademicTierId;
  label: string;
  weight: number;
  description: string;
}

export interface StyleConfig {
  id: LearningStyleId;
  label: string;
  weight: number;
  description: string;
}

export const ACADEMIC_TIERS: TierConfig[] = [
  {
    id: "on_grade",
    label: "On-grade-level generalist",
    weight: 0.25,
    description:
      "A typical student performing at expected grade level. Follows well-structured, clearly-sequenced explanations; " +
      "responds well to a normal classroom pace, but can lose the thread if a step is skipped or a concept is introduced without a bridge from prior knowledge.",
  },
  {
    id: "struggling",
    label: "Struggling / below grade level",
    weight: 0.25,
    description:
      "A student working below grade level who needs concepts broken into small steps with concrete examples and repetition. " +
      "Struggles with abstract language, dense text, or content that assumes background knowledge not explicitly reviewed; disengages quickly if lost.",
  },
  {
    id: "advanced",
    label: "Advanced / gifted",
    weight: 0.25,
    description:
      "A student who grasps concepts quickly and can get bored or disengaged by content that moves too slowly or over-explains the obvious. " +
      "Responds well to nuance, extension questions, or connections to deeper ideas; may 'succeed' on paper while being under-challenged.",
  },
  {
    id: "high_needs",
    label: "Low-income / high-needs",
    weight: 0.25,
    description:
      "A student whose comprehension is sensitive to unstated assumptions of background context, resources, or vocabulary that isn't universally accessible. " +
      "Responds well to explicit, self-contained explanations; can be lost by references to experiences, materials, or vocabulary assumed but not provided in the lesson.",
  },
];

export const LEARNING_STYLES: StyleConfig[] = [
  {
    id: "visual",
    label: "Visual",
    weight: 0.25,
    description:
      "Learns best from diagrams, images, spatial layout, and visual demonstration. Struggles when a concept is described only in words with no visual anchor.",
  },
  {
    id: "auditory",
    label: "Auditory",
    weight: 0.25,
    description:
      "Learns best from spoken explanation, discussion, and verbal repetition. Struggles when content is presented as dense silent reading with no verbal walkthrough.",
  },
  {
    id: "read_write",
    label: "Read/Write",
    weight: 0.25,
    description:
      "Learns best from text, written definitions, and note-taking. Struggles when a concept is only demonstrated verbally or physically with no written anchor.",
  },
  {
    id: "kinesthetic",
    label: "Kinesthetic",
    weight: 0.25,
    description:
      "Learns best from hands-on activity, physical manipulation, or concrete action tied to the concept. Struggles when a concept is entirely abstract or text-based with no hands-on or physical analogy.",
  },
];

export function buildArchetypes(): Archetype[] {
  const archetypes: Archetype[] = [];
  for (const tier of ACADEMIC_TIERS) {
    for (const style of LEARNING_STYLES) {
      archetypes.push({
        id: `${tier.id}_${style.id}`,
        tier: tier.id,
        style: style.id,
        weight: tier.weight * style.weight,
      });
    }
  }
  return archetypes;
}

export function describeArchetype(archetype: Archetype): string {
  const tier = ACADEMIC_TIERS.find((t) => t.id === archetype.tier)!;
  const style = LEARNING_STYLES.find((s) => s.id === archetype.style)!;
  return (
    `Academic tier — ${tier.label}: ${tier.description}\n` +
    `Learning style — ${style.label}: ${style.description}`
  );
}

export const WEAK_CHUNK_THRESHOLD = 0.7;
