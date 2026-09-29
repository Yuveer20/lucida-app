# Lucida — Product Requirements Document (PRD)

**Last updated:** August 23, 2026 (added the 5-category assessment rubric; mobile-friendly design pulled into Milestone 1; Milestone 3 storage/auth specified as Firebase)
**Status:** Portfolio project, with potential future small-scale school deployment

---

## 1. Problem statement

Teachers write lesson plans without a reliable way to know, in advance, where the plan will lose students and *why*. Feedback normally only arrives after the lesson is taught — too late to revise it. Lucida lets a teacher test a lesson plan against a simulated classroom *before* teaching it, surfacing exactly which parts of the lesson will and won't land, for which kinds of students, why — grounded in real learning-science research rather than folk theories like learning styles.

---

## 2. Target user

A teacher (initially: you, for portfolio purposes; later: teachers at a real school, smaller scale) who wants to sanity-check a lesson plan before delivering it.

---

## 3. Product vision (what "done" looks like across all milestones)

A teacher uploads or pastes a lesson plan, and within a short wait, sees:
- 2-3 headline, prioritized recommendations for the lesson
- A breakdown by student dimension (academic tier, prior knowledge, cognitive load tolerance, reading level, attention/self-regulation, motivation, income/resource access, parental education level, home language status, mindset)
- A chunk-by-chunk view showing exactly where the lesson works and where it doesn't
- For every weak point, a plain-language explanation of *why* it didn't land for a given student type — including where a practical, classroom-tested view and a research-grounded view disagree — and a concrete, source-traceable suggestion for fixing it
- The ability to revise a chunk and immediately recheck it, with the system actively guarding against its own hallucination or drift

Over time (later milestones), teachers can log in, save assessments, revisit lesson history, share results with colleagues, and get Student Agents calibrated to their actual school district using real regional education data.

**Design requirement — mobile-friendly:** the UI is responsive from Milestone 1 onward, not deferred to a later mobile-specific milestone. A teacher should be able to use Lucida comfortably on a phone or tablet (e.g. checking a lesson plan between classes), even though the initial platform target is web. See Technical Design §1a for how this is achieved without adopting a separate CSS framework.

---

## 4. Core user flow (Milestone 1 / MVP)

1. **Upload page:** Teacher pastes their lesson plan text into a text box and submits.
2. **Processing state:** The system chunks the lesson into logical sections and runs Student Agents, the Experienced Teacher Agent, the Expert-in-Teaching-Science Agent, and a QA/grounding pass against each chunk. A loading state communicates this is happening (this takes real time — many LLM calls run per assessment).
3. **Results page (tiered, not a data dump):**
   - **Top level:** 2-3 headline recommendations, prioritized by impact, plus the 5-category rubric scorecard (§6) for the lesson overall
   - **Mid level:** chunk heatmap and per-dimension breakdown views (toggle between dimensions), comprehension shown as a confidence range rather than a false-precision single number; each chunk shows its own compact rubric scorecard
   - **Full depth (on clicking a chunk):** full per-archetype Student Agent detail, full Teacher Agent and Expert Agent critiques — including an explicit callout where they disagree ("pedagogically ideal" vs. "practically realistic") — every Expert Agent suggestion traceable to the specific research principle behind it, and the full rubric breakdown for that chunk, including which specific principle drove a merged rubric category (e.g. whether "Teaching approach" scored low due to retrieval practice, misconceptions, or scaffolding)
4. Teacher revises a chunk directly in-app and re-runs just that chunk (**revise-and-recheck loop**), seeing a before/after comparison. The QA pass checks that the recheck is responding to the actual revision rather than repeating stale or hallucinated critique.

---

## 5. Feature requirements by milestone

### Milestone 1 — MVP

| Feature | Requirement |
|---|---|
| Upload | Copy/paste text input |
| Chunking | Automatic, logical-section-based (not fixed size) |
| Student Agents | ~16-20 curated composite profiles, each a realistic, correlated bundle across 10 evidence-backed dimensions (academic tier, prior knowledge, cognitive load tolerance, reading level, attention/self-regulation, motivation, income/resource access, parental education level, home language status, mindset) — replaces the old fixed 16-archetype learning-styles grid, which is dropped entirely. Ethnicity and gender are explicitly excluded as dimensions (see §7). |
| Teacher Agent | Practical, classroom-realism critique of the lesson |
| Expert Agent | Research-grounded critique, every suggestion traceable to a named learning-science principle |
| Disagreement surfacing | Teacher/Expert Agent conflicts shown explicitly, not merged |
| Confidence framing | Results shown as ranges/confidence levels, not false-precision percentages |
| QA / hallucination check | Grounding, consistency, and cross-agent sanity checks before results are shown |
| Revise-and-recheck loop | Re-run a single revised chunk with before/after comparison and recheck-specific QA |
| Improvement suggestions | Auto-generated wherever a chunk underperforms, source-traceable |
| Assessment rubric | 5-category rubric (§6) scored per chunk and for the lesson overall, shown alongside agent critiques |
| Results views | Tiered: headline recommendations → dimension/chunk breakdowns → full per-chunk drill-down, with the rubric scorecard surfaced at each tier |
| Responsive design | UI is mobile-friendly from Milestone 1 — usable on phone/tablet screen sizes, not just desktop |
| Accounts | None — session only, nothing persists after leaving the page |

### Milestone 2 — Expanded uploads

| Feature | Requirement |
|---|---|
| Upload formats | PDF, Word (.docx), Slideshow (.pptx), in addition to paste |
| Chunking | Adapted per format (e.g. slide-level chunking for .pptx) |

### Milestone 3 — Accounts & persistence

| Feature | Requirement |
|---|---|
| Auth | Firebase Authentication for teacher login/signup |
| Storage | Firebase (Firestore) — lesson plans and assessments saved per teacher |
| History | View, reopen, and compare past assessments, including revise-and-recheck history |

### Milestone 4 — Small-scale school deployment & regional grounding

| Feature | Requirement |
|---|---|
| Multi-teacher | Lightweight shared org context for one school |
| Regional grounding | Student Agents calibrated to the teacher's actual school district using real public education data (e.g. NCES/state testing data — reading proficiency, % English learners, class size, resource access), not demographic-category inference |
| Export/share | Report export (PDF or shareable link) |
| Calibration | Agent weights/descriptions refined using real feedback |

---

## 5a. Student Agent profile design (finalized)

**Approach: curated composite personas, not a mechanical dimension cross.** Two designs were considered:

- **Two-tier (structural + modifier):** a small number of dimensions (e.g. tier × prior knowledge, ~10-12 archetypes) get dedicated profiles; the rest are folded into each profile's description as a described range rather than separately tracked. Cheaper, but loses the ability to attribute a stuck point to a specific secondary factor (e.g. can't distinguish "struggled due to home-language gap" from "struggled due to attention span").
- **Composite personas (chosen):** ~16-20 full profiles are hand-designed, each spanning all 10 dimensions as a realistic, internally-consistent bundle (e.g. a profile combining struggling-reader + high-motivation + short-attention-span + first-gen household, because that combination actually occurs together in real classrooms) rather than crossing every dimension mathematically. This was chosen because it delivers real per-profile depth and specific, attributable reasons for a chunk's outcome, which is what was wanted from this rework — a full dimension cross would run 500+ archetypes and be both cost-prohibitive and less realistic (it would treat clearly correlated traits as independent).

**Profile count: 16-20.** Below ~12, realistic dimension combinations start going unrepresented; above ~25, additional profiles are barely distinguishable from existing ones and add cost without adding insight. 16-20 keeps call count and cost in the same range as the old 16-archetype system while delivering much richer, per-profile detail.

**Dimensions explicitly excluded:** ethnicity and gender were considered and dropped. Neither has credible evidence as a predictor of comprehension or learning ability; adding either as a Student Agent dimension would require fabricating an outcome pattern not supported by research, which would undercut the tool's scientific-accuracy premise. Where gender- or ethnicity-adjacent effects are real (e.g. stereotype threat from how a chunk is framed), those are properties of the lesson content for the Expert Agent to flag — not traits of a simulated student.

---

## 6. Assessment rubric

Chunks are scored against a single, unified rubric — not split visually by which agent produced each finding — so a teacher sees one consistent scorecard per chunk rather than three separate agent reports. Five categories, each mapped to exactly one source:

| # | Category | Source | What it checks |
|---|---|---|---|
| 1 | Lesson flow | Student Agents | Chunk-by-chunk comprehension across the simulated classroom; automatically flags the weakest chunk. Shown as a visual (an outlined ring, not a Strong/Adequate/Needs Work/Missing band), since it's a direct readout of the simulation rather than a scored judgment. |
| 2 | Cognitive load | Expert Agent | Whether the amount of new information is manageable, and whether the chunk is free of clutter that doesn't serve the concept |
| 3 | Uses visuals where helpful | Expert Agent | Whether abstract or complex ideas are paired with a visual or concrete representation, not text alone. A chunk that has no visual because it doesn't need one is not a deficiency. |
| 4 | Teaching approach | Expert Agent | Combines active-practice opportunities, whether common misconceptions are addressed, and whether support is matched to the student's level — judged holistically for what the chunk's role in the lesson actually calls for. The specific principle and citation for each contributing flag still appear in the per-chunk drill-down. |
| 5 | Classroom fit | Teacher Agent | Combines pacing, engagement, and resource/feasibility realism |

Categories 2-5 are scored Strong / Adequate / Needs Work / Missing, judged directly by the sourcing agent as part of its regular review — not derived after the fact from critique sentiment, since a binary works/concern signal can't honestly support four distinct levels. **Labels shown by default are plain-language** (e.g. "Uses visuals where helpful," "Teaching approach") — the underlying research term (Cognitive Load Theory, retrieval practice, etc.) and citation are available as a secondary tag, not the primary label, so the default view doesn't read like an education-research paper.

**Lesson-level scoring is worst-chunk-wins**, not an average: for each banded category, the lesson-level score is the weakest chunk's score for that category, and the drill-down names which chunk drove it. Averaging a real problem away would contradict the "what to fix first" goal the whole results page is built around (§4).

This rubric was deliberately condensed from an earlier 10-category draft. Categories 2-5 are each sourced from exactly one agent — no category blends Expert-agent research-backed criteria with Teacher-agent practical judgment — so a "Needs Work" score never implies more scientific rigor than it actually has.

---

## 7. Non-goals (explicitly out of scope)

- Simulated personas specific to IEP/learning disabilities — these students already receive dedicated support through school resource programs, and simulating them adds complexity without matching what a general lesson-plan check needs to catch.
- Dedicated English-language-learner-specific personas beyond the general language-status dimension in the Student Agent model.
- District/enterprise-scale admin tooling, SSO, or multi-school management.
- Automated lesson plan rewriting (Lucida surfaces problems and suggestions; the teacher revises).
- Inferring Student Agent traits from demographic identity categories (race, ethnicity, income bracket) rather than real, aggregate education statistics — a deliberate design decision to avoid encoding stereotypes into the simulation.
- Ethnicity and gender as Student Agent dimensions — no credible evidence they predict comprehension; see §5a.

---

## 8. Success criteria (MVP)

Since this starts as a portfolio project, "success" for Milestone 1 means:
- A pasted lesson plan reliably produces a chunked, multi-agent assessment without manual intervention
- The results page offers genuinely more than one useful way to see where a lesson succeeds/fails, without overwhelming the default view
- The improvement suggestions are specific enough to a chunk and student dimension — and traceable to a real principle or practical concern — that they'd plausibly change what a teacher does next, not generic advice
- The system can catch and flag its own likely hallucinations or ungrounded critiques rather than presenting them as fact

---

## 9. Open questions to revisit

- Is a single final reveal fine, or is streaming results in per-agent still worth it for perceived speed, given the higher call count?
- At school scale (Milestone 4), should agent dimension weights be adjustable per-teacher (e.g. a teacher of an ELL-heavy class might want that dimension weighted up), or kept fixed for consistency, or set automatically via regional grounding?
- Should the revise-and-recheck comparison extend to a full lesson-level "diff" view once saved-assessment history exists (Milestone 3)?
