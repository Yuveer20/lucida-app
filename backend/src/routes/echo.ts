import { Router } from "express";
import { chatRaw } from "../llm/groqClient.js";
import type { EchoRequest, EchoResponse, ApiError } from "@lucida/shared";

export const echoRouter = Router();

echoRouter.post("/", async (req, res) => {
  const body = req.body as Partial<EchoRequest>;
  if (!body.rawText || typeof body.rawText !== "string" || body.rawText.trim().length === 0) {
    return res.status(400).json({ error: "rawText is required" } satisfies ApiError);
  }

  try {
    const raw = await chatRaw({
      systemPrompt: "You are a helpful assistant. Briefly acknowledge the lesson plan text you were given.",
      userPrompt: body.rawText,
    });
    res.json({ raw } satisfies EchoResponse);
  } catch (err) {
    res.status(502).json({ error: `LLM call failed: ${(err as Error).message}` } satisfies ApiError);
  }
});
