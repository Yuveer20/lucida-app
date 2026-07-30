import { buildArchetypes } from "../config/personas.js";
import { simulatePersona } from "./simulatePersona.js";
import type { Chunk, PersonaResult } from "@lucida/shared";

export interface SimulateAllResult {
  personaResults: PersonaResult[];
  partialFailures: string[];
}

export async function simulateAllPersonas(chunks: Chunk[]): Promise<SimulateAllResult> {
  const archetypes = buildArchetypes();

  const settled = await Promise.allSettled(
    archetypes.map((archetype) => simulatePersona(archetype, chunks))
  );

  const personaResults: PersonaResult[] = [];
  const partialFailures: string[] = [];

  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") {
      personaResults.push(...outcome.value);
    } else {
      partialFailures.push(archetypes[index].id);
      console.error(`Persona simulation failed for archetype ${archetypes[index].id}:`, outcome.reason);
    }
  });

  return { personaResults, partialFailures };
}
