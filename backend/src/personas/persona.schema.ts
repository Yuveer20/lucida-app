import { z } from "zod";

export const PersonaSimResponseSchema = z.object({
  archetype: z.string().min(1),
  chunk_results: z.array(
    z.object({
      chunk_id: z.string().min(1),
      understood: z.boolean(),
      confidence: z.number().min(0).max(1),
      reason: z.string().min(1),
      stuck_point: z.string().nullable(),
    })
  ),
});

export type PersonaSimResponse = z.infer<typeof PersonaSimResponseSchema>;
