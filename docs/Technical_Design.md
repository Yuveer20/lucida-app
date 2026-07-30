# Lucida — Technical Design Doc

**Scope:** Covers Milestone 0 & 1 (core assessment loop) in depth, with forward notes for Milestones 2-4.
**Last updated:** July 30, 2026

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) | Fastest path to a clean web MVP; component logic reuses well into React Native/Expo later for the mobile milestone |
| Styling | Tailwind CSS | Fast iteration, easy to keep consistent as screens grow |
| Charts | Recharts | Handles pie chart + bar/heatmap views without heavy custom SVG work |
| Backend | Node.js (TypeScript) API server | Same language as frontend — one mental model, one type system shared via a common `types` package |
| LLM provider | Anthropic API (Claude) | Used for both chunking and persona simulation calls |
| File parsing (Milestone 2+) | `pdf-parse` (PDF), `mammoth` (docx), a pptx text-extraction library | Deferred to Milestone 2, noted here so the upload pipeline is designed to accept them later without a rewrite |
| Storage (Milestone 3+) | Postgres | Relational fit for teachers → lesson plans → assessments → chunks, deferred until login milestone |
| Auth (Milestone 3+) | Standard session/JWT-based auth, or an auth provider (e.g. Auth0/Clerk) if you want to avoid building it from scratch | Deferred |

For Milestone 1, there is **no database** — everything lives in server memory / is passed straight back to the client for the duration of the session. This keeps the MVP simple and avoids building storage twice (once ad hoc, once "for real" in Milestone 3).

---

## 2. High-level architecture (Milestone 1)

```
┌─────────────┐      1. paste lesson text       ┌──────────────┐
│   Frontend   │ ──────────────────────────────▶ │  API Server   │
│  (React)     │                                  │  (Node/TS)    │
│              │ ◀────────────────────────────── │               │
└─────────────┘      4. assessment JSON           └──────┬────────┘
                                                            │
                                    2. chunk the lesson     │
                                    3. run persona sims     ▼
                                                    ┌──────────────┐
                                                    │  Claude API   │
                                                    └──────────────┘
```

The API server does two distinct kinds of LLM calls:
1. **Chunking call** — one call, given the full lesson text, returns an ordered list of logical chunks with boundaries and a short label per chunk (e.g. "Intro / hook", "Direct instruction: photosynthesis", "Group activity").
2. **Persona simulation calls** — one call per persona archetype, each covering the full set of chunks in a single pass, run in parallel where possible.

---

## 3. Chunking

**Input:** raw lesson text (plus, in Milestone 2+, extracted text from PDF/docx/pptx).

**Approach:** a single LLM call with a structured-output prompt asking Claude to segment the lesson into logical sections (not fixed word counts), returning JSON:

```json
{
  "chunks": [
    { "id": "c1", "label": "Intro / hook", "text": "..." },
    { "id": "c2", "label": "Direct instruction: photosynthesis", "text": "..." }
  ]
}
```

This keeps chunk boundaries meaningful (a full concept explanation stays together) rather than arbitrarily cutting mid-thought, which matters a lot for realistic comprehension simulation.

---

## 4. Persona engine

### 4.1 Persona archetypes

Two independent axes, sampled per simulated student rather than combined into a fixed named list — this keeps the persona count small (LLM calls scale with *archetypes*, not with all 500 students) while still letting the 500-student pool reflect realistic diversity:

**Academic/support tier** (4 archetypes):
- On-grade-level generalist
- Struggling / below grade level
- Advanced / gifted
- Low-income / high-needs

**Learning style** (4 archetypes, equally weighted at 25% each):
- Visual
- Auditory
- Read/write
- Kinesthetic

*(A "multimodal" style was considered and dropped — it has no distinct sensory failure mode to diagnose, so it added a call without adding diagnostic signal. General "does this land regardless of modality" is already captured by the academic-tier axis.)*

This gives **4 × 4 = 16 archetype combinations**. Each combination is simulated via a single LLM call that walks through the *entire* lesson (all chunks) in one pass, then the result is statistically scaled to represent its proportional share of the 500-student population (see §4.3).

### 4.2 Persona simulation call (batched across chunks)

Rather than one call per (archetype × chunk) — which would scale calls with chunk count — each archetype gets **one call for the whole lesson**, given all chunks in order, so it can walk through them the way a real student would (carrying comprehension or confusion forward from one chunk to the next). The prompt includes:

- All chunks, in order, with their labels
- A description of the persona (academic tier + learning style + what that combination tends to struggle with or respond well to)
- Instructions to return, per chunk: whether this type of student understood it, a confidence/comprehension estimate, the specific reason(s) for success or difficulty, and what part of the chunk (if any) caused confusion

Structured JSON output, e.g.:

```json
{
  "archetype": "struggling_kinesthetic",
  "chunk_results": [
    { "chunk_id": "c1", "understood": true, "confidence": 0.75, "reason": "Concrete example anchored the concept", "stuck_point": null },
    { "chunk_id": "c2", "understood": false, "confidence": 0.3, "reason": "Explanation was entirely text-based with no hands-on or physical analogy", "stuck_point": "The abstract description of energy conversion with no concrete action to anchor it" }
  ]
}
```

This gives the same chunk-by-chunk granularity as a per-chunk call would, at a fraction of the call count — and arguably more realistic results, since a real student's understanding of chunk 2 is affected by whether chunk 1 landed.

### 4.3 Scaling to 500

Each of the 16 archetype combinations has a population weight = (academic tier weight) × (learning style weight, 1/4 each). Each archetype's per-chunk results are applied to `weight × 500` simulated students when computing aggregate stats (e.g. overall comprehension %, pie chart breakdown). Academic tier weights and learning style weights are configurable constants (see §4.4) so they can be tuned later without changing the simulation logic.

### 4.4 Configuration, not hardcoding

Persona weights and descriptions live in a config file/table, not hardcoded in prompts — this makes it easy to adjust weights, add or remove an archetype, or (in Milestone 4) recalibrate based on real classroom feedback without touching the simulation pipeline code.

### 4.5 Cost/performance note

With batching, this is **16 LLM calls per assessment** (one per archetype, covering all chunks) plus 1 chunking call — 17 total, regardless of how many chunks the lesson has. At current published rates this comes out to roughly **$0.15-0.35 per assessment** depending on model choice, and since the calls are independent they parallelize cleanly — a full assessment should complete in well under a minute. If lessons get much longer (very high chunk counts), the per-call prompt/output size grows, which is the one thing worth re-checking as real usage comes in.

---

## 5. Data model (conceptual, formalized in Milestone 3)

Even though Milestone 1 has no database, designing the shape now avoids rework:

```
LessonPlan
  - id
  - rawText
  - createdAt

Chunk
  - id
  - lessonPlanId
  - label
  - text
  - order

PersonaResult
  - id
  - chunkId
  - archetype (academic_tier + learning_style)
  - understood (bool)
  - confidence (0-1)
  - reason (text)
  - stuckPoint (text, nullable)

Assessment (aggregate, computed — not stored until Milestone 3)
  - lessonPlanId
  - overallComprehensionRate
  - perChunkBreakdown
  - perArchetypeBreakdown
```

In Milestone 3, `Assessment` becomes a real persisted table tied to a `Teacher` and `LessonPlan`, enabling the history view.

---

## 6. Frontend structure (Milestone 1)

```
/src
  /pages
    UploadPage.tsx
    ResultsPage.tsx
  /components
    ChunkCard.tsx
    ComprehensionPieChart.tsx
    TierBreakdown.tsx          // 4-category view, collapses across learning style
    StyleBreakdown.tsx         // 4-category view, collapses across academic tier
    ChunkHeatmap.tsx           // chunk x tier or chunk x style, toggle between the two
    ChunkDrillDown.tsx         // full 16-archetype detail for one selected chunk
    ImprovementSuggestions.tsx
  /api
    assessmentClient.ts   // calls the backend, typed request/response
  /types
    shared types (imported from a shared package with the backend where possible)
```

**Results page views (collapse by default, drill in for full detail):**

Showing all 16 archetype combinations at once (a 16-column heatmap, a 16-slice legend) would be visually noisy and doesn't match how a teacher actually scans for problems — they think in terms of *either* skill level *or* learning style, rarely both simultaneously. So the default views collapse the 16 archetypes down to one axis at a time, and the full cross only appears once a teacher drills into a specific chunk:

- **Pie chart:** overall comprehension split across all 500 simulated students
- **Tier breakdown:** comprehension % by academic tier only (4 categories — sums across all 4 learning styles per tier)
- **Style breakdown:** comprehension % by learning style only (4 categories — sums across all 4 tiers per style)
- **Chunk heatmap:** chunk × tier (default) or chunk × style (toggle) — 4 columns either way, never 16, so the weak spot is scannable at a glance
- **Chunk drill-down:** clicking a chunk reveals the full 16-archetype detail *for that chunk specifically* — every tier/style combination's comprehension, reasons, stuck points, and improvement suggestions. This is where the full granularity lives; it reads as a focused diagnosis of one chunk rather than a wall of data about the whole lesson.

---

## 7. Forward notes for later milestones

- **Milestone 2 (file formats):** parsing happens before chunking — PDFs/docx/pptx get converted to the same raw-text-plus-structure format the chunker already expects, so the chunking/persona pipeline doesn't need to change.
- **Milestone 3 (accounts/storage):** introduces Postgres and auth; the conceptual data model in §5 becomes real tables.
- **Milestone 4 (school deployment):** revisit persona weights and archetype descriptions using real feedback; revisit the cost math in §4.5 now that usage patterns are real instead of estimated.
