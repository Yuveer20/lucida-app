# Lucida — Technical Design Doc

**Scope:** Covers Milestone 0 & 1 (core assessment loop) in depth, with forward notes for Milestones 2-4.
**Last updated:** August 23, 2026 (added the 5-category assessment rubric — §4.10; Firebase specified for Milestone 3 storage/auth; mobile-first requirement pulled into Milestone 1 — see §1a addendum)

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) | Fastest path to a clean web MVP; component logic reuses well into React Native/Expo later for the mobile milestone |
| Styling | Lucida Design System tokens (CSS custom properties) | See §1a — supersedes the earlier Tailwind choice |
| Charts | None in Milestone 1 | See §1a — the design system expresses comprehension as roll-call strips and confidence ranges, not charts |
| Backend | Node.js (TypeScript) API server | Same language as frontend — one mental model, one type system shared via a common `shared` package |
| LLM provider | Anthropic API (Claude), Groq as a stopgap | See §1b — auto-switches to Anthropic the moment `ANTHROPIC_API_KEY` is set |
| File parsing (Milestone 2+) | `pdf-parse` (PDF), `mammoth` (docx), a pptx text-extraction library | Deferred to Milestone 2, noted here so the upload pipeline is designed to accept them later without a rewrite |
| Storage (Milestone 3+) | Firebase (Firestore) | Document-store fit for teachers → lesson plans → assessments → chunks; deferred until login milestone |
| Auth (Milestone 3+) | Firebase Authentication | Deferred; pairs naturally with Firestore for storage, avoids standing up a separate auth provider |
| Regional education data (Milestone 4+) | NCES / state testing data APIs | Deferred — used to calibrate Student Agents to a real district's profile |

For Milestone 1, there is **no database** — everything lives in server memory / is passed straight back to the client for the duration of the session.

### 1a. Styling decision (supersedes Tailwind + Recharts)

Milestone 1 is built against the **Lucida Design System** (Claude Design project `fe1bab0f`), which ships a complete token layer as CSS custom properties (`--paper-*`, `--teacher-*`, `--expert-*`, `--confidence-*`, type and spacing scales) plus a component library authored with inline styles referencing those tokens.

Two consequences:

- **Tailwind is not used.** Adding it would mean maintaining a second source of truth for the same colors, type scale, and spacing, and the ported components would still reach for the CSS variables anyway. The tokens are imported directly (`frontend/src/styles/tokens.css`) and the design system's components are ported to typed TSX in `frontend/src/ds/`.
- **Recharts is not used.** The design system deliberately renders comprehension as `RollCallStrip` (one dot per student profile, filled = understood) and `ConfidenceRange` (a low–high band, not a point estimate). Both are a handful of divs. This is also the better fit for §4.5's confidence framing: a pie chart implies a precision the simulation does not have.

Dark mode ships free — the token file defines a `[data-theme="dark"]` block.

**Addendum (Aug 23):** a later external draft of this doc reopened this decision — it lists Tailwind CSS again, framed as "built responsive/mobile-first from Milestone 1," alongside a new explicit product requirement that Milestone 1 be mobile-friendly (PRD §3). That mobile-first requirement is real and is now implemented (see the responsive notes in §6), but it doesn't change the styling conclusion above: the Lucida Design System already expresses responsiveness through its own tools — CSS custom properties plus ordinary media queries in `frontend/src/styles/app.css` (the dual-margin `ChunkCard` stacking below 1020px, the chunk ledger collapsing to one column below 720px, the header layout freeing up space reserved for the dark-mode toggle below 640px) — the same mechanism Tailwind's mobile-first utilities would provide, without a second source of truth for color/type/spacing or a rewrite of the ported component library. Reinstating Tailwind at this point would mean discarding a working, on-brand implementation to match a stale tech-stack row from a document lineage that predates the design-system decision, not gaining a capability the app doesn't already have.

### 1b. Provider abstraction (Groq stopgap)

The original Milestone 0 scaffold was Groq-backed. Milestone 1 was designed and built against the Anthropic API — structured outputs (`output_config.format`), adaptive thinking, and prompt caching are all load-bearing in the pipeline (§4.9a) — but during initial setup, only a Groq key was available. Rather than block on an Anthropic key, `backend/src/llm/client.ts` dispatches every model call through a provider abstraction with two implementations:

- **Anthropic** (`backend/src/llm/client.ts`) — the primary path. Structured outputs, adaptive thinking, effort levels, prompt caching.
- **Groq** (`backend/src/llm/providers/groq.ts`) — OpenAI-compatible `chat.completions`, `response_format: {type: "json_object"}` for valid JSON, with the JSON Schema serialized into the prompt as an instruction rather than enforced by the API. This is a real gap, not a formality: Groq guarantees syntactic JSON, not conformance to the schema's required fields or types. It has been reliable in testing because every Lucida schema is flat and simple, but it is not the same guarantee Anthropic's structured outputs provide, and a more complex schema could expose the difference.

**Selection is automatic, not a setting you maintain.** `backend/src/config/env.ts` resolves the provider each boot: an explicit `LUCIDA_PROVIDER` env var wins; otherwise `ANTHROPIC_API_KEY` is preferred over `GROQ_API_KEY` when both are present; otherwise whichever key exists. Concretely: with only `GROQ_API_KEY` set, the app runs on Groq; adding `ANTHROPIC_API_KEY` to the same `.env` switches every subsequent boot to Anthropic with no other change. `GET /api/health` reports the active `provider`.

Effort levels, adaptive thinking, and prompt-cache markers are Anthropic-only; the Groq path ignores them silently rather than erroring, since they have no equivalent to fall back to. Every other pipeline behavior — chunking, the 18-persona roster, the QA grounding pass, disagreement detection, the cost levers in §4.9a — is provider-agnostic, because they all sit on top of `callStructured()` rather than on either SDK directly.

This is explicitly a stopgap, not a long-term two-provider commitment: once an Anthropic key is in place, there is no remaining reason to exercise the Groq path, and it should be expected to bit-rot rather than be kept in sync with future schema changes.

---

## 2. High-level architecture (Milestone 1)

```
┌──────────────┐      1. paste lesson text       ┌───────────────┐
│   Frontend   │ ───────────────────────────────▶│  API Server   │
│  (React)     │                                  │  (Node/TS)    │
│              │ ◀─────────────────────────────── │               │
└──────────────┘      6. assessment JSON          └───────┬───────┘
                                                          │
                          2. chunk the lesson             │
                          3. run Student Agents           │
                          4. run Teacher + Expert Agents  ▼
                          5. run QA/hallucination pass ┌───────────────┐
                                                       │  Claude API   │
                                                       └───────────────┘
```

The API server runs four distinct kinds of LLM calls per assessment:
1. **Chunking call** — one call, given the full lesson text, returns an ordered list of logical chunks.
2. **Student Agent calls** — one call per student archetype, each covering the full set of chunks in a single pass.
3. **Teacher Agent + Expert Agent calls** — one call each, each reviewing the whole lesson (and the Student Agent results) from their respective angle.
4. **QA pass** — a lighter-weight call that grounds-checks the above outputs against the actual chunk text before they're returned to the client.

---

## 3. Chunking

A single LLM call with a structured-output prompt segments the lesson into logical sections (not fixed word counts), returning JSON:

```json
{
  "chunks": [
    { "id": "c1", "label": "Intro / hook", "text": "..." },
    { "id": "c2", "label": "Direct instruction: photosynthesis", "text": "..." }
  ]
}
```

Implemented in `backend/src/chunking/chunkLesson.ts`. The `text` field is required to be verbatim from the input so the QA pass (§4.6) can grep critiques back to real source text.

---

## 4. Agent system

The earlier design used a fixed 4×4 grid (academic tier × learning style = 16 archetypes). **The learning-style axis is dropped entirely.** It was built on the VARK/"visual-auditory-kinesthetic" framework, which has been repeatedly tested and found to have no predictive effect on comprehension — including in a controlled study specifically designed to test it (Rogowsky, Calhoun & Tallal, 2015, *Journal of Educational Psychology*, 107(1), 64–78; replicated with younger students in Rogowsky, Calhoun & Tallal, 2020, *Frontiers in Psychology*). Even VARK's own creator has characterized it as a reflection prompt rather than a diagnostic or predictive tool (Fleming & Baume, 2006, "Learning Styles Again: VARKing up the right tree!", *Educational Developments* 7.4). The broader academic critique is summarized in Pashler, McDaniel, Rohrer & Bjork (2008, *Psychological Science in the Public Interest*, 9(3), 105-119) and Willingham, Hughes & Dobolyi (2015, *Teaching of Psychology*, 42(3), 266-271).

In its place, Lucida moves from a single "persona engine" to three distinct **agent roles**, each with a different job.

### 4.1 Student Agents

Simulate a diverse classroom's comprehension, chunk by chunk. Archetypes are built from ten evidence-backed dimensions instead of a fixed style grid:

- **Academic/support tier**: on-grade-level generalist, struggling/below grade level, advanced/gifted, low-income/high-needs
- **Prior knowledge / topic familiarity** — grounded in the "expertise reversal effect" (Kalyuga et al.): scaffolding that helps a novice can actively hurt someone who already knows the material
- **Working memory / cognitive load tolerance** — grounded in Cognitive Load Theory (Sweller)
- **Reading level / vocabulary**
- **Attention span / self-regulation**
- **Motivation / interest in the subject**
- **Income / resource access**
- **Parental education level** (first-generation vs. not)
- **Home language status**
- **Mindset** (growth vs. fixed leaning, per Dweck)

**Explicitly excluded:** ethnicity and gender. Content-level effects sometimes associated with these categories (e.g. stereotype threat from how a chunk is framed) belong to the Expert Agent's critique of the lesson content, not to a Student Agent trait.

**Archetype design: curated composite personas, 18 profiles** (within the 16-20 band). Each profile is a hand-designed, internally-consistent bundle representing a combination that actually occurs in real classrooms. The roster lives in `backend/src/config/personas.ts` — data, not prompt strings (§4.8).

Each Student Agent receives all chunks in order in a single batched call (not one call per chunk): a real student's understanding of chunk 2 is affected by whether chunk 1 landed, and batching avoids scaling call count with chunk count.

### 4.2 Experienced Teacher Agent

One call, reviewing the whole lesson from a practical, classroom-tested angle: pacing, engagement, realistic classroom-management constraints. This agent is deliberately *not* required to justify itself with research citations — its value is practical realism, not theoretical grounding.

### 4.3 Expert-in-Teaching-Science Agent

One call, reviewing the whole lesson against established learning-science research. Every flag or suggestion must be traceable to a specific principle from the registry in `backend/src/config/principles.ts`:

- **Mayer's Cognitive Theory of Multimedia Learning** — multimedia, coherence, signaling, redundancy
- **Cognitive Load Theory** (Sweller) — intrinsic/extraneous/germane load
- **Retrieval practice / the testing effect** (Roediger & Karpicke)
- **Expertise reversal effect** (Kalyuga et al.)
- **Explicit misconception correction**
- **Spaced practice**
- **Growth mindset framing** (Dweck)

Each suggestion stores which principle generated it, surfaced inline in the UI.

### 4.4 Disagreement surfacing

The Teacher Agent and Expert Agent run as **separate passes** and are never merged into a single verdict. Where they disagree, both views are shown explicitly, labeled "practically realistic" vs. "pedagogically ideal". Detection is deterministic post-processing (`backend/src/agents/disagreement.ts`): both agents tag each chunk-level critique with a stance, and a chunk where the two stances conflict becomes a `Disagreement` record.

### 4.5 Confidence framing (avoiding false precision)

Results are reported as ranges or qualitative confidence levels rather than single decimal-precision percentages. Each Student Agent reaction reports its own `[low, high]` band directly — a single pass already produces an honest range, rather than a range only existing because it was assembled from repeat calls. Where `LUCIDA_STUDENT_PASSES` > 1, additional passes widen the band further when they disagree about the midpoint, and that inter-pass disagreement also feeds the QA pass. The result is `[min(bands), max(bands)]`, floored at a 10-point width so no single-pass result renders as false certainty.

### 4.6 QA / hallucination check

A dedicated pass that:
- **Grounding check:** requires each critique/flag to quote the specific span of the chunk it's reacting to; critiques whose quoted span does not appear in the chunk text are flagged `ungrounded` and demoted to low confidence. This is checked in code first (substring match, normalized whitespace) and only ambiguous cases go to the model.
- **Consistency check:** uses variance across repeated Student Agent runs (§4.5) — high variance on a given critique is surfaced as low-confidence rather than presented as settled.
- **Cross-agent sanity check:** spot-checks Student Agent reactions against the actual chunk content before they are shown.
- **Recheck-specific check:** on the revise-and-recheck loop (§4.7), compares the new critique against the old one — if an agent claims the same specific unrelated issue persists after a targeted fix elsewhere in the chunk, that's flagged as a sign the agent isn't correctly re-reading the revision.

### 4.7 Revise-and-recheck loop

A teacher can revise a specific chunk in-app and re-run just that chunk against the same agents, producing a before/after comparison rather than a fresh full-lesson assessment. `POST /api/recheck` takes the original chunk, the revision, and the prior result, and returns a `RecheckResult` with before/after confidence and a QA verdict.

### 4.8 Configuration, not hardcoding

Agent descriptions, Student Agent dimension weights, the persona roster, and the principle registry live in config modules under `backend/src/config/`, not inline in prompt strings. This keeps it easy to adjust weights, add/remove a dimension, or (in Milestone 4) recalibrate using regional education data without touching the core pipeline code.

### 4.9 Cost/performance note

Per-assessment call count at the default config (`LUCIDA_PERSONAS_PER_CALL=1`, `LUCIDA_STUDENT_PASSES=1`):

- 1 chunking call
- 18 Student Agent calls (one per persona, each batched across all chunks)
- 1 Teacher Agent call
- 1 Expert Agent call
- 0-1 QA pass call (only fires when a quote is a near-miss rather than a clean match or a clean non-match — see §4.6)

**≈ 21-22 calls per assessment.** Calls are independent and parallelize cleanly behind a concurrency limiter (`LUCIDA_CONCURRENCY`, default 6).

**Student Agents are the cost centre.** They are the only agent whose call count scales with the persona roster (18 of the ~21 calls), and — because thinking tokens dominate spend on a reasoning-capable model — they are the majority of the *token* cost too, not just the call count. Three independent levers, each in `.env.example` with the tradeoff it buys:

- `LUCIDA_STUDENT_MODEL` — point Student Agents at a cheaper model than the critique agents (e.g. Haiku 4.5 while Teacher/Expert stay on Sonnet or Opus). This is the single largest lever, because it discounts the majority-share cost centre directly rather than shrinking it.
- `LUCIDA_PERSONAS_PER_CALL` — batch multiple personas into one call. Cuts call count and the repeated lesson-text token cost proportionally; the risk, and why it defaults to 1, is the model blurring distinct profiles into one generic reaction. `studentAgents.ts` mitigates this with an explicit anti-blurring instruction and by striding the roster (adjacent, thematically-similar personas land in different batches) rather than slicing it, but batching above ~3-4 personas per call is untested for whether it actually preserves per-profile distinctiveness.
- `LUCIDA_STUDENT_PASSES` — repeat passes per persona. No longer required for confidence *ranges* to exist (see §4.5 — each pass now reports its own band), so this now buys stability against a single unlucky generation, not the range itself. 1 is the documented default; raise it only if single-pass results look noisy in practice.

`LUCIDA_MODEL` sets the default for every agent; `claude-sonnet-5` is the project default (chosen over Opus for near-Opus quality on this kind of structured, well-specified work at roughly half the per-token price — see the root `.env.example`). The revise-and-recheck loop only re-runs the affected chunk against the same roster, so a recheck costs roughly one chunk's share of a full assessment.

**Do not carry forward a per-assessment dollar estimate from an earlier draft of this doc or from conversation.** Cost depends on lesson length, model, and all three levers above; check `GET /api/health` → `projectedCallsPerAssessment` for the current config's call count, and price it against the current published rate for whichever model `LUCIDA_STUDENT_MODEL` and `LUCIDA_MODEL` resolve to.

### 4.10 Assessment rubric

Every chunk is scored against one unified rubric rather than three separate agent reports, so results read as a single consistent scorecard. Five categories, each sourced from exactly one agent so a merged category never implies more scientific rigor than it has:

| # | Category (plain label) | Source | Underlying principle(s) | Scoring |
|---|---|---|---|---|
| 1 | Lesson flow | Student Agents | Direct readout of §4.1 comprehension results per chunk | Visual (outlined ring, weakest chunk flagged), not banded |
| 2 | Cognitive load | Expert Agent | Cognitive Load Theory (Sweller); Coherence, Signaling, and Redundancy principles (Mayer) — merged, since all four are ways of managing extraneous processing load in Mayer's own framework | Strong / Adequate / Needs Work / Missing |
| 3 | Uses visuals where helpful | Expert Agent | Multimedia principle (Mayer) | Strong / Adequate / Needs Work / Missing |
| 4 | Teaching approach | Expert Agent | Retrieval practice, spaced practice (Roediger & Karpicke); explicit misconception correction (Muller, 2008 — the same researcher behind the Veritasium video that started this rework); expertise-reversal / scaffolding fit (Kalyuga); worked-example effect (Sweller & Cooper) | Strong / Adequate / Needs Work / Missing |
| 5 | Classroom fit | Teacher Agent | Pacing, engagement, resource/feasibility realism — practical judgment, no citation implied | Strong / Adequate / Needs Work / Missing |

`growth-mindset-framing` deliberately maps to none of the four banded categories — it doesn't fit cognitive load, visuals, or the active-practice/scaffolding family Teaching Approach covers, and forcing it in would be arbitrary. Its critiques still appear in the per-chunk critique list; they just don't roll up into a scored rubric row. The full principle→category mapping lives in `backend/src/config/principles.ts` (`PRINCIPLE_RUBRIC_CATEGORY`).

**Bands are agent-judged, not derived from critique sentiment.** Each critique already carries a binary `stance` (`works`/`concern`), which can't honestly support four distinct levels — deriving "Adequate" vs. "Needs Work" from a boolean would be an arbitrary heuristic dressed up as a judgment. Instead, the Teacher and Expert Agent schemas (`backend/src/llm/schemas.ts`) each carry an additional `rubric` array, asking the agent to score every chunk once per category it owns (Classroom Fit for the Teacher Agent; Cognitive Load, Visuals, and Teaching Approach for the Expert Agent) as part of the same structured-output call — no extra call, and no chunk defaults to "Strong" just because nothing else was flagged. Band definitions (what "Missing" means for each category, and the explicit instruction that a chunk not needing a visual is not a deficiency) live in the agent system prompts in `backend/src/config/agents.ts`.

**The "why" behind a score is derived, not asked for twice.** Critiques already carry `chunkId` and (for the Expert Agent) `principleId`; `backend/src/aggregation/rubric.ts` filters each chunk's critiques by the principle→category mapping to populate `RubricCategoryScore.citedCritiqueIds`, and the drill-down resolves those back to principle names. This is what lets the UI show, for a "Needs Work" Teaching Approach score, exactly which principle(s) — retrieval practice, misconception correction, or scaffolding — drove it, without the agent redundantly restating the link in its own output.

**Lesson-level aggregation is worst-chunk-wins, not an average.** For each banded category, the lesson-level score is the weakest chunk's score for that category (`RUBRIC_BAND_SEVERITY` orders `missing < needs-work < adequate < strong`), and `LessonRubric.weakestChunkId` records which chunk drove it — the same "what to fix first" philosophy as the headline recommendations and the confidence-range combination in §4.5. Lesson Flow instead points at the single lowest-confidence chunk across the whole lesson, mirroring the grade stamp's own logic.

**Plain-language labels:** the table's "Category" column is what's shown by default in the UI (`RubricScorecard`, `RubricDetailList` in `frontend/src/ds/lesson.tsx`). The specific research term is available as a secondary tag in the full drill-down view, not the primary label — avoids presenting the default view in academic jargon while keeping full traceability one click away.

---

## 5. Data model (conceptual, formalized in Milestone 3)

Defined as TypeScript types in `shared/src/`. Key records:

```
LessonPlan     — id, rawText, createdAt
Chunk          — id, lessonPlanId, label, text, order
StudentAgentResult — id, chunkId, personaId, understood, confidenceRange,
                     reason, stuckPoint, qaFlag
TeacherAgentCritique — id, chunkId (nullable), critique, stance
ExpertAgentCritique  — id, chunkId (nullable), critique, principle, stance, quote
Disagreement   — id, chunkId, teacherCritiqueId, expertCritiqueId, note
Suggestion     — id, chunkId, text, source (teacher|expert), principle
RubricCategoryScore — category, band (null for Lesson Flow), note, citedCritiqueIds (§4.10)
ChunkRubric    — chunkId, scores (5 × RubricCategoryScore)
LessonRubric   — scores (5 × RubricCategoryScore, worst-chunk-wins), weakestChunkId (per category)
Assessment     — lessonPlanId, overallComprehensionRange, perChunkBreakdown,
                 perDimensionBreakdown, headlineRecommendations (2-3, prioritized),
                 rubric (LessonRubric)
```

In Milestone 3, `Assessment` becomes a real persisted document tied to a `Teacher` and `LessonPlan` in Firestore.

---

## 6. Frontend structure (Milestone 1)

```
/src
  /screens
    UploadScreen.tsx        // paste-text landing screen
    ProcessingScreen.tsx    // multi-agent loading state, rotating step labels
    ResultsScreen.tsx       // headline recs → lesson rubric → dimension toggle → chunk ledger
    ChunkDrilldown.tsx      // per-chunk detail + full rubric breakdown + revise-and-recheck
  /ds                       // Lucida Design System, ported to typed TSX
    Button, Badge, Card, Tabs, Tag
    Input, Select, Textarea
    ChunkCard, ConfidenceRange, DisagreementCallout, ExpertNote,
    TeacherNote, GradeStamp, RollCallStrip, HeadlineRecommendation
    RubricBandDot, RubricScorecard, RubricDetailList   // §4.10 — added post-port, not from the original design project
  /styles/tokens.css        // design-system token layer (light + dark)
  /styles/app.css           // media queries the token layer can't express inline (§ mobile-friendly, below)
  /api/client.ts
```

**Results page views — tiered to avoid output overload.** The default view answers "what should I change first," not "show me everything":

- **Top tier (default landing view):** grade stamp + 2-3 headline recommendations, prioritized by impact, plus the lesson-level rubric scorecard (`RubricScorecard`, non-dense)
- **Mid tier:** the chunk ledger — one row per chunk with a roll-call strip, confidence range, and a compact rubric scorecard (`RubricScorecard`, dense — dots only, full detail on hover), with a dimension toggle above it
- **Full depth (only on clicking into a chunk):** full per-archetype Student Agent detail, full Teacher and Expert critiques (including any disagreement, labeled), confidence ranges, the full rubric breakdown for that chunk (`RubricDetailList` — band, agent's note, and the specific principle tags behind any Expert-sourced score), and the revise-and-recheck panel, which now also shows a before/after rubric comparison alongside the before/after confidence range

**Mobile-friendly from Milestone 1 (PRD §3), via the design system's own tools — see §1a.** Responsiveness is media queries in `frontend/src/styles/app.css` reading the same CSS-variable tokens as everything else, not a separate framework:

- `ChunkCard`'s dual margin (Teacher left, Expert right) stacks to one column below 1020px.
- The chunk ledger's 4-column grid (chunk / comprehension / confidence / rubric) collapses to one column below 720px, and its column-header row hides at that breakpoint since per-column headers don't mean anything once the row has stacked.
- Both top-level screens reserve ~110-130px of header space for the fixed dark-mode toggle; below 640px that reservation is dropped back to a plain 24px gutter via `.lucida-header-toggle-gutter`, since on a phone width the reservation would otherwise eat most of the row a nav menu has nowhere to wrap into.
- `ChunkDrilldown`'s side panel is `width: 640px` capped at `max-width: 90vw`, so it already scales down on narrow viewports without a breakpoint of its own.

---

## 7. Forward notes for later milestones

- **Milestone 2 (file formats):** parsing happens before chunking — PDFs/docx/pptx get converted to the same raw-text-plus-structure format the chunker already expects, so the chunking/agent pipeline doesn't change.
- **Milestone 3 (accounts/storage):** introduces Firebase (Firestore for storage, Firebase Authentication for login); the conceptual data model in §5 becomes real Firestore collections, with nested/related records as subcollections or embedded documents depending on query needs — to be finalized when Milestone 3 is implemented.
- **Milestone 4 (school deployment & regional grounding):** Student Agent dimension weights get calibrated using real, aggregate public education data tied to the teacher's school/district, rather than generic weighting. Also revisit the cost math in §4.9 now that usage patterns are real instead of estimated.

---

## 8. Key sources (Expert Agent grounding + design rationale)

- Pashler, H., McDaniel, M., Rohrer, D., & Bjork, R. (2008). Learning styles: Concepts and evidence. *Psychological Science in the Public Interest*, 9(3), 105-119.
- Willingham, D. T., Hughes, E. M., & Dobolyi, D. G. (2015). The scientific status of learning styles theories. *Teaching of Psychology*, 42(3), 266-271.
- Rogowsky, B. A., Calhoun, B. M., & Tallal, P. (2015). Matching learning style to instructional method: Effects on comprehension. *Journal of Educational Psychology*, 107(1), 64-78.
- Rogowsky, B. A., Calhoun, B. M., & Tallal, P. (2020). Providing instruction based on students' learning style preferences does not improve learning. *Frontiers in Psychology*, 11.
- Fleming, N., & Baume, D. (2006). Learning Styles Again: VARKing up the right tree! *Educational Developments*, SEDA Ltd, 7.4, 4-7.
- Mayer, R. E. (2021/2024). Cognitive Theory of Multimedia Learning / Multimedia Learning (various editions).
- Sweller, J. Cognitive Load Theory (foundational and ongoing work).
- Roediger, H. L., & Karpicke, J. D. (2006). The power of testing memory. *Perspectives on Psychological Science*, 1(3), 181-210.
- Muller, D. A. (2008). Designing effective multimedia for physics education (Doctoral dissertation, University of Sydney) — found that videos explicitly presenting and refuting a common misconception produced better learning than straightforward, misconception-free exposition; feeds the Teaching Approach rubric category (§4.10).
- Kalyuga, S. et al. — expertise reversal effect (foundational and ongoing work).
- Dweck, C. S. — growth vs. fixed mindset (foundational and ongoing work).
- Sweller, J., & Cooper, G. — worked example effect (feeds the Teaching Approach rubric category, §4.10).
