import Groq from "groq-sdk";
import type { ZodSchema } from "zod";
import { env } from "../config/env.js";

const groq = new Groq({ apiKey: env.groqApiKey });

export class LLMParseError extends Error {
  constructor(message: string, public readonly lastRawResponse: string) {
    super(message);
    this.name = "LLMParseError";
  }
}

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

/** One raw, unvalidated chat completion — used for the Milestone 0 checkpoint route. */
export async function chatRaw(params: { systemPrompt: string; userPrompt: string }): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: env.groqModel,
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

/**
 * A chat completion validated against a Zod schema, with JSON mode plus up to
 * `maxRetries` repair prompts if the model's output fails schema validation.
 */
export async function chatJSON<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: ZodSchema<T>;
  maxRetries?: number;
}): Promise<T> {
  const maxRetries = params.maxRetries ?? 2;
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: params.systemPrompt },
    { role: "user", content: params.userPrompt },
  ];

  let lastRaw = "";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const completion = await groq.chat.completions.create({
      model: env.groqModel,
      messages,
      response_format: { type: "json_object" },
    });
    lastRaw = completion.choices[0]?.message?.content ?? "";

    try {
      const parsed = JSON.parse(stripCodeFence(lastRaw));
      const result = params.schema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      messages.push({ role: "assistant", content: lastRaw });
      messages.push({
        role: "user",
        content: `Your previous response failed schema validation: ${result.error.message}. Return corrected JSON only, matching the schema exactly.`,
      });
    } catch (err) {
      messages.push({ role: "assistant", content: lastRaw });
      messages.push({
        role: "user",
        content: `Your previous response was not valid JSON (${(err as Error).message}). Return corrected JSON only.`,
      });
    }
  }

  throw new LLMParseError(`Failed to get valid JSON after ${maxRetries + 1} attempts`, lastRaw);
}
