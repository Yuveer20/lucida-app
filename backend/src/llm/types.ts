/** Shared across providers so client.ts and llm/providers/*.ts can both use it without a circular import. */
export interface StructuredCallOptions {
  system: string;
  /**
   * Content blocks for the user turn. Mark the stable prefix (the lesson
   * chunks, which are identical across all 18 personas) with `cache: true` so
   * repeated Student Agent calls read one cache entry instead of re-paying
   * for the lesson text every time. Anthropic-only — Groq has no prompt
   * caching, so its provider ignores the flag and just concatenates blocks.
   */
  blocks: Array<{ text: string; cache?: boolean }>;
  schema: Record<string, unknown>;
  /** Anthropic-only; the Groq provider ignores this. */
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  maxTokens?: number;
  /** Overrides the provider's default model. */
  model?: string;
}
