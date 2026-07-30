import { z } from "zod";

export const ChunkingResponseSchema = z.object({
  chunks: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .min(1),
});

export type ChunkingResponse = z.infer<typeof ChunkingResponseSchema>;
