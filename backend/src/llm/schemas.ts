/**
 * JSON Schemas for `output_config.format`.
 *
 * Every object needs `additionalProperties: false` and an explicit `required`
 * list — structured outputs reject schemas without them. Numeric constraints
 * (minimum/maximum) are NOT supported, so ranges are validated in code after
 * parsing rather than declared here.
 */
import { PRINCIPLE_IDS } from '../config/principles.js';

/**
 * One rubric category's judgment for one chunk (Technical Design §4.10).
 * Shared by the Teacher and Expert schemas below — each asks for a different
 * set of categories, but every category uses this same shape.
 */
const rubricScoreSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['band', 'score', 'note'],
  properties: {
    band: {
      type: 'string',
      enum: ['strong', 'adequate', 'needs-work', 'missing'],
    },
    // A second, more granular readout of the same judgment — not derived from
    // band in code, so it has to actually agree with it (checked in
    // rubric.ts) rather than silently drifting.
    score: {
      type: 'integer',
      description:
        '0-10, matching the band: strong=9-10, adequate=7-8, needs-work=4-6, missing=0-3. Give the specific number your judgment actually supports, not just the middle of the range every time.',
    },
    // Kept short on purpose: this fires once per category per chunk on every
    // Teacher/Expert call, so its length multiplies across the whole
    // assessment. A full sentence here was measurably pushing the Groq
    // stopgap (§1b) past its rate-limit backoff budget for no real benefit —
    // the critique text already carries the detailed reasoning.
    note: {
      type: 'string',
      description: 'Under 12 words justifying the band. Not a full sentence. Plain language, no jargon.',
    },
  },
} as const;

export const chunkingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['chunks'],
  properties: {
    chunks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'text'],
        properties: {
          label: { type: 'string', description: 'Short section name, e.g. "Intro / hook".' },
          text: {
            type: 'string',
            description: 'Verbatim text of this section, copied exactly from the lesson plan.',
          },
        },
      },
    },
  },
} as const;

export const studentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['reactions'],
  properties: {
    reactions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'personaId',
          'chunkId',
          'understood',
          'comprehensionLow',
          'comprehensionHigh',
          'reason',
          'stuckPoint',
          'quote',
        ],
        properties: {
          personaId: {
            type: 'string',
            description: 'The id of the student profile this reaction belongs to.',
          },
          chunkId: { type: 'string' },
          understood: { type: 'boolean' },
          // Asking for the band directly rather than a point estimate is what
          // lets a single pass produce an honest range. Repeat passes then
          // widen it further where they disagree, instead of being the only
          // source of width (§4.5).
          comprehensionLow: {
            type: 'integer',
            description:
              '0-100. The low end of how much of this chunk this student plausibly took away. Widen the band when the outcome genuinely depends on something the plan does not settle.',
          },
          comprehensionHigh: {
            type: 'integer',
            description:
              '0-100. The high end. A band narrower than 10 points asserts more precision than a simulation can support.',
          },
          reason: {
            type: 'string',
            description:
              'Why, tied to a specific named trait from this student profile. Not "it was confusing". Under 20 words, plain simple language, no jargon.',
          },
          stuckPoint: {
            type: ['string', 'null'],
            description: 'The specific thing that blocked them, or null if nothing did.',
          },
          quote: {
            type: ['string', 'null'],
            description: 'Verbatim span of the chunk that drove this reaction.',
          },
        },
      },
    },
  },
} as const;

export const teacherSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['critiques', 'suggestions', 'rubric'],
  properties: {
    critiques: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['chunkId', 'critique', 'stance', 'quote'],
        properties: {
          chunkId: { type: ['string', 'null'], description: 'null for lesson-level points.' },
          critique: {
            type: 'string',
            description: 'Under 20 words. One short, plain, simple sentence. No jargon.',
          },
          stance: {
            type: 'string',
            enum: ['works', 'concern'],
            description: '"works" = this is fine, keep it. "concern" = this needs attention.',
          },
          quote: { type: ['string', 'null'] },
        },
      },
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['chunkId', 'text'],
        properties: {
          chunkId: { type: 'string' },
          text: {
            type: 'string',
            description:
              'A concrete change a real teacher could make. Under 20 words, plain and simple. No jargon.',
          },
        },
      },
    },
    rubric: {
      type: 'array',
      description:
        'One "Classroom fit" score per chunk — required for every chunk, even chunks with no critique.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['chunkId', 'classroomFit'],
        properties: {
          chunkId: { type: 'string' },
          classroomFit: rubricScoreSchema,
        },
      },
    },
  },
} as const;

export const expertSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['critiques', 'suggestions', 'rubric'],
  properties: {
    critiques: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['chunkId', 'critique', 'principleId', 'stance', 'quote'],
        properties: {
          chunkId: { type: ['string', 'null'] },
          critique: {
            type: 'string',
            description:
              'Under 20 words. One short, plain, simple sentence — no jargon. The principleId field is the citation; do not also name the concept in this text.',
          },
          principleId: {
            type: 'string',
            enum: [...PRINCIPLE_IDS],
            description: 'Must be an id from the supplied principle registry.',
          },
          stance: { type: 'string', enum: ['works', 'concern'] },
          quote: { type: ['string', 'null'] },
        },
      },
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['chunkId', 'text', 'principleId'],
        properties: {
          chunkId: { type: 'string' },
          text: {
            type: 'string',
            description: 'Under 20 words. One plain, simple sentence. No jargon.',
          },
          principleId: { type: 'string', enum: [...PRINCIPLE_IDS] },
        },
      },
    },
    rubric: {
      type: 'array',
      description:
        'Three scores per chunk (Cognitive load, Uses visuals, Teaching approach) — required for every chunk, even chunks with no critique.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['chunkId', 'cognitiveLoad', 'visuals', 'teachingApproach'],
        properties: {
          chunkId: { type: 'string' },
          cognitiveLoad: rubricScoreSchema,
          visuals: rubricScoreSchema,
          teachingApproach: rubricScoreSchema,
        },
      },
    },
  },
} as const;

export const qaSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'grounded', 'note'],
        properties: {
          id: { type: 'string', description: 'The critique id supplied in the input.' },
          grounded: { type: 'boolean' },
          note: { type: 'string', description: 'One sentence. Empty string if grounded.' },
        },
      },
    },
  },
} as const;

export const recheckQaSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['respondedToRevision', 'note', 'staleCritiques'],
  properties: {
    respondedToRevision: {
      type: 'boolean',
      description:
        'False if the new critique repeats a prior point that the revision already addressed.',
    },
    note: { type: 'string' },
    staleCritiques: {
      type: 'array',
      items: { type: 'string', description: 'Ids of critiques that ignored the revision.' },
    },
  },
} as const;

// Headline recommendations are derived deterministically from the weakest
// chunks and their attached suggestions (see aggregation/aggregate.ts) rather
// than generated by a further call — the agents have already written the
// imperative sentence, and ranking it is arithmetic.
