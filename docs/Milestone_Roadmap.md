# Lucida — Milestone Roadmap

**Project:** Lucida — an AI-simulated classroom that lets teachers test a lesson plan against a simulated classroom before ever teaching it, assessed by a team of specialized AI agents.
**Status:** Portfolio project (potential future use at a school, smaller scale)
**Last updated:** August 11, 2026

---

## How to read this doc

Each milestone has a goal, the deliverables that ship in it, the key decisions locked in for it, and exit criteria (how we know it's done). Milestones build on each other — later ones assume earlier ones are stable.

---

## Milestone 0 — Foundations ✅
**Goal:** Nothing user-facing yet. Get the skeleton in place so every later milestone has something to build on.

**Deliverables:**
- Repo scaffolding: React (Vite) frontend, Node/Express backend, shared type definitions
- LLM API integration wired up (key management, a basic prompt-and-parse round trip working end to end)
- Basic CI (lint, type-check, build)
- Empty-state versions of the two core screens (Upload, Results) so navigation exists

**Exit criteria:** A lesson plan pasted into a text box can trigger one real LLM call and the raw response renders somewhere on screen, unstyled.

---

## Milestone 1 — Core Assessment Loop (MVP)
**Goal:** A teacher can paste a lesson plan and get a real, useful, multi-angle, scientifically-grounded assessment back.

**Deliverables:**
- **Upload page:** copy/paste text input only (file formats come in Milestone 2)
- **Chunking engine:** AI splits the lesson into logical sections rather than fixed-size blocks
- **Agent system** (replaces the earlier fixed 16-archetype/learning-styles model — see Technical Doc §4):
  - **Student Agents:** 18 curated composite profiles, each a realistic, correlated bundle across ten evidence-backed dimensions. Ethnicity and gender are explicitly excluded
  - **Experienced Teacher Agent:** practical, classroom-tested critique (pacing, engagement, realistic constraints)
  - **Expert-in-Teaching-Science Agent:** research-grounded critique, every suggestion traceable to a named principle
- **Disagreement surfacing:** where the Teacher and Expert Agents conflict, both are shown rather than merged
- **Confidence framing:** comprehension reported as ranges, reflecting that this is a simulation, not measured data
- **QA / hallucination check:** verifies critiques are grounded in the actual lesson text, flags low-confidence and inconsistent results
- **Revise-and-recheck loop:** revise a chunk, re-run just that chunk, before/after comparison, recheck-specific QA
- **Per-chunk scoring:** comprehension estimate, reasons, and where each student type got stuck
- **Improvement suggestions:** generated wherever a chunk underperforms, each traceable to the agent/principle that raised it
- **Results page (tiered to avoid output overload):**
  - Top-level: grade stamp + 2-3 headline recommendations
  - Mid-level: chunk ledger with roll-call strips and confidence ranges, plus a dimension toggle
  - Full depth (on drill-down only): full student-agent breakdown, Teacher/Expert critiques, disagreements, confidence, citations

**Key decisions locked in:**
- No login/accounts yet — session-based, results don't persist after the tab closes
- Web only (React, chosen so the same components can extend to React Native/Expo later)
- The old fixed 16-archetype (4 academic tiers × 4 learning styles) model is retired; the learning-style axis is dropped entirely as scientifically unsupported
- Styling is the Lucida Design System token layer, not Tailwind; no chart library (see Technical Doc §1a)

**Exit criteria:** A teacher can paste a real lesson plan, get chunked results back within a reasonable wait, see the tiered results view, get at least one actionable, source-traceable improvement suggestion per weak chunk, and revise/recheck a chunk. This is the milestone worth demoing.

---

## Milestone 2 — Expanded Upload Formats
**Goal:** Remove the copy/paste-only limitation so real lesson materials can be assessed.

**Deliverables:**
- PDF upload + text extraction
- Word doc (.docx) upload + text extraction
- Slideshow (.pptx) upload + text extraction (including speaker notes)
- Format-specific chunking adjustments (e.g. a slideshow's natural chunk boundary is often the slide itself)

**Exit criteria:** All four input methods (paste, PDF, docx, pptx) produce a comparably useful assessment.

---

## Milestone 3 — Accounts & Persistence
**Goal:** Teachers can log in, save their work, and come back to it.

**Deliverables:**
- Authentication (login/signup)
- Persistent storage of uploaded lesson plans and their assessments
- History view: past assessments, ability to re-open and compare
- Basic user settings (e.g. default grade level/subject context for chunking and agent calibration)

**Exit criteria:** A teacher can log out, log back in, and see their past lesson assessments exactly as they left them.

---

## Milestone 4 — Small-Scale School Deployment & Regional Grounding (stretch)
**Goal:** Support the smaller-scale, real-school use case, and make Student Agents reflect the actual population a lesson will be taught to.

**Deliverables:**
- Lightweight multi-teacher support (shared org/school context)
- **Regional grounding for Student Agents:** use the teacher's school district to pull real, aggregate public education data (NCES/state testing data) and calibrate Student Agent archetypes to that district's actual profile. Deliberately grounded in real education statistics, not demographic-category inference
- Export/share an assessment as a report (PDF or link)
- Refinement of agent calibration using real classroom feedback
- Cost/performance tuning now that real usage patterns exist

**Exit criteria:** A small group of real teachers at one school can use Lucida independently without you manually setting anything up for them.

---

## Explicitly out of scope (for now)

- IEP/learning-disability-specific simulated personas (handled by schools' existing resource specialists)
- English-learner-specific *dedicated* personas beyond the general home-language-status dimension
- Ethnicity and gender as Student Agent dimensions — no credible evidence they predict comprehension
- Full district/enterprise-scale multi-tenant admin tooling
