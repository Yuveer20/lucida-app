# Lucida — Milestone Roadmap

**Project:** Lucida — an AI-simulated classroom that lets teachers test a lesson plan against 500 simulated students before ever teaching it.
**Status:** Portfolio project (potential future use at a school, smaller scale)
**Last updated:** July 30, 2026

---

## How to read this doc

Each milestone has a goal, the deliverables that ship in it, the key decisions locked in for it, and exit criteria (how we know it's done). Milestones build on each other — later ones assume earlier ones are stable.

---

## Milestone 0 — Foundations
**Goal:** Nothing user-facing yet. Get the skeleton in place so every later milestone has something to build on.

**Deliverables:**
- Repo scaffolding: React (Vite) frontend, chosen backend framework, shared type definitions
- LLM API integration wired up (key management, a basic prompt-and-parse round trip working end to end)
- Basic CI (lint, type-check, build)
- Empty-state versions of the two core screens (Upload, Results) so navigation exists

**Exit criteria:** A lesson plan pasted into a text box can trigger one real LLM call and the raw response renders somewhere on screen, unstyled. No personas, no chunking, no scoring yet — just proving the pipe works.

---

## Milestone 1 — Core Assessment Loop (MVP)
**Goal:** A teacher can paste a lesson plan and get a real, useful, multi-angle assessment back.

**Deliverables:**
- **Upload page:** copy/paste text input only (file formats come in Milestone 2)
- **Chunking engine:** AI splits the lesson into logical sections (intro, activity, concept explanation, etc.) rather than fixed-size blocks
- **Persona engine:** 16 LLM persona archetypes, each run once per lesson (walking through all chunks in a single pass); results statistically scaled to represent a simulated population of 500 students. Two independent axes per simulated student:
  - *Academic/support tier:* on-grade-level generalist, struggling/below grade level, advanced/gifted, low-income/high-needs
  - *Learning style:* visual, auditory, read/write, kinesthetic — weighted equally across styles
- **Per-chunk scoring:** for each chunk, a comprehension rate (% of simulated students who "got it"), the reasons why students did or didn't understand, and where each student type got stuck
- **Improvement suggestions:** wherever a chunk underperforms, generated ideas for how to revise it
- **Results page:**
  - Pie chart of overall comprehension across the simulated population
  - Per-student-type breakdown (by academic tier and by learning style)
  - Chunk-by-chunk drill-down view
  - At least one more visualization style beyond the pie chart (e.g. a chunk-by-chunk heatmap or bar comparison) so there are multiple easy ways to see the data, per your requirement

**Key decisions locked in:**
- No login/accounts yet — session-based, results don't persist after the tab closes
- Web only (React, chosen so the same components can extend to React Native/Expo later)

**Exit criteria:** A teacher can paste a real lesson plan, get chunked results back within a reasonable wait time, see the pie chart + breakdown views, and get at least one actionable improvement suggestion per weak chunk. This is the milestone worth demoing.

---

## Milestone 2 — Expanded Upload Formats
**Goal:** Remove the copy/paste-only limitation so real lesson materials (not just text) can be assessed.

**Deliverables:**
- PDF upload + text extraction
- Word doc (.docx) upload + text extraction
- Slideshow (.pptx) upload + text extraction (including speaker notes, since slides alone often lack context)
- Format-specific chunking adjustments (e.g. a slideshow's natural chunk boundary is often the slide itself)

**Exit criteria:** All four input methods (paste, PDF, docx, pptx) produce a comparably useful assessment.

---

## Milestone 3 — Accounts & Persistence
**Goal:** Teachers can log in, save their work, and come back to it.

**Deliverables:**
- Authentication (login/signup)
- Persistent storage of uploaded lesson plans and their assessments
- History view: past assessments, ability to re-open and compare
- Basic user settings (e.g. default grade level/subject context for chunking and persona calibration)

**Exit criteria:** A teacher can log out, log back in, and see their past lesson assessments exactly as they left them.

---

## Milestone 4 — Small-Scale School Deployment (stretch)
**Goal:** Support the smaller-scale, real-school use case you mentioned wanting down the line.

**Deliverables:**
- Lightweight multi-teacher support (shared org/school context, no need for full enterprise admin tooling at this scale)
- Export/share an assessment as a report (PDF or link)
- Refinement of persona calibration using any real feedback gathered from actual classroom use
- Cost/performance tuning of the persona engine now that real usage patterns exist

**Exit criteria:** A small group of real teachers at one school can use Lucida independently without you manually setting anything up for them.

---

## Explicitly out of scope (for now)

- IEP/learning-disability-specific simulated personas (handled by schools' existing resource specialists)
- English-learner-specific simulated personas
- Full district/enterprise-scale multi-tenant admin tooling
