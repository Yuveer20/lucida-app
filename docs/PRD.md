# Lucida — Product Requirements Document (PRD)

**Last updated:** July 30, 2026
**Status:** Portfolio project, with potential future small-scale school deployment

---

## 1. Problem statement

Teachers write lesson plans without a reliable way to know, in advance, where the plan will lose students and *why*. Feedback normally only arrives after the lesson is taught — too late to revise it. Lucida lets a teacher test a lesson plan against a simulated classroom of 500 students *before* teaching it, surfacing exactly which parts of the lesson will and won't land, for which kinds of students, and why.

---

## 2. Target user

A teacher (initially: you, for portfolio purposes; later: teachers at a real school, smaller scale) who wants to sanity-check a lesson plan before delivering it.

---

## 3. Product vision (what "done" looks like across all milestones)

A teacher uploads or pastes a lesson plan, and within a short wait, sees:
- An overall comprehension score for the lesson
- A breakdown of that score by the type of student (academic tier, learning style)
- A chunk-by-chunk view showing exactly where the lesson works and where it doesn't
- For every weak point, a plain-language explanation of *why* it didn't land for a given student type, and a concrete suggestion for fixing it

Over time (later milestones), teachers can log in, save assessments, revisit lesson history, and (at school scale) share results with colleagues.

---

## 4. Core user flow (Milestone 1 / MVP)

1. **Upload page:** Teacher pastes their lesson plan text into a text box and submits.
2. **Processing state:** The system chunks the lesson into logical sections and runs the simulated classroom against each chunk. A loading state communicates this is happening (this takes real time — dozens of LLM calls run per assessment).
3. **Results page:** Teacher sees:
   - A pie chart of overall comprehension across the simulated 500 students
   - Two collapsed breakdown views — by academic tier (4 categories) and by learning style (4 categories) — each summing across the other axis so the default view never shows all 16 archetype combinations at once
   - A chunk heatmap (chunk × tier, or chunk × style via toggle) showing comprehension per chunk without a 16-column wall of data
   - Clicking into any chunk reveals the full per-archetype detail (all 16 combinations) for that chunk specifically — which student types struggled, the specific reasons why, what they got stuck on, and suggested revisions. This full granularity only appears once focused on a single chunk, where it reads as a diagnosis rather than a data dump.
4. Teacher revises their lesson plan (outside the app, for now) based on the feedback and can re-submit to compare.

---

## 5. Feature requirements by milestone

### Milestone 1 — MVP

| Feature | Requirement |
|---|---|
| Upload | Copy/paste text input |
| Chunking | Automatic, logical-section-based (not fixed size) |
| Simulation | 16 persona archetypes (4 academic tiers × 4 learning styles), each run once per lesson across all chunks, scaled to represent 500 students |
| Per-chunk output | Comprehension rate, reasons for success/failure, per-archetype stuck points |
| Improvement suggestions | Auto-generated wherever a chunk underperforms |
| Results views | Pie chart (overall) + separate tier breakdown + separate learning-style breakdown + chunk heatmap (tier/style toggle) — full 16-archetype detail only shown when a specific chunk is opened |
| Accounts | None — session only, nothing persists after leaving the page |

### Milestone 2 — Expanded uploads

| Feature | Requirement |
|---|---|
| Upload formats | PDF, Word (.docx), Slideshow (.pptx), in addition to paste |
| Chunking | Adapted per format (e.g. slide-level chunking for .pptx) |

### Milestone 3 — Accounts & persistence

| Feature | Requirement |
|---|---|
| Auth | Teacher login/signup |
| Storage | Lesson plans and assessments saved per teacher |
| History | View, reopen, and compare past assessments |

### Milestone 4 — Small-scale school deployment

| Feature | Requirement |
|---|---|
| Multi-teacher | Lightweight shared org context for one school |
| Export/share | Report export (PDF or shareable link) |
| Calibration | Persona weights/descriptions refined using real feedback |

---

## 6. Non-goals (explicitly out of scope)

- Simulated personas specific to IEP/learning disabilities — these students already receive dedicated support through school resource programs, and simulating them adds complexity without matching what a general lesson-plan check needs to catch.
- Simulated personas specific to English-language-learner status.
- District/enterprise-scale admin tooling, SSO, or multi-school management.
- Automated lesson plan rewriting (Lucida surfaces problems and suggestions; the teacher revises).

---

## 7. Success criteria (MVP)

Since this starts as a portfolio project, "success" for Milestone 1 means:
- A pasted lesson plan reliably produces a chunked, multi-angle assessment without manual intervention
- The results page offers genuinely more than one useful way to see where a lesson succeeds/fails (not just a single chart)
- The improvement suggestions are specific enough to a chunk and student type that they'd plausibly change what a teacher does next, not generic advice

---

## 9. Design summary (Milestone 1 mockup)

A high-fidelity static mockup of the MVP flow was built (`Lucida - Refined.dc.html`) covering all three Milestone 1 screens: Upload, Processing, and Results.

**Visual direction:** Dark "night control-room" aesthetic — near-black slate background with a soft dual-tone radial gradient glow behind the header. Monochrome slate palette (cool blue-gray, violet-gray, tan-gray, and a bright red reserved for critical/low-comprehension flags) rather than a single bright accent — restrained, deliberate corner radii and no decorative glow effects. Space Grotesk (display) paired with Manrope (body).

**Screens:**
- **Upload:** Hero copy + textarea for pasting a lesson plan, a "What gets simulated" side panel listing the 4 academic tiers and 4 learning styles, and a "Run simulation" CTA.
- **Processing:** Overall progress bar, a 5-chunk status strip, and a live 16-archetype (4 tier × 4 style) status grid showing done/simulating/queued per archetype.
- **Results:** Overall comprehension ring, separate tier and learning-style breakdown bars, and a chunk × tier/style heatmap (toggleable axis) that avoids showing all 16 archetype combinations at once. Clicking a chunk expands an inline diagnosis panel with the full 16-archetype grid plus the 3 worst-performing archetypes, each with a specific reason and suggested fix — matching the PRD's "diagnosis, not data dump" requirement.

**Sample content used:** A 5-chunk 7th-grade photosynthesis lesson, used to populate realistic comprehension numbers, heatmap values, and chunk-specific diagnoses throughout the mockup.

Other explored directions (not selected): a red-on-white modular grid system, a warm rounded green/gold consumer style, and a newspaper/broadsheet editorial treatment — all preserved as separate files in the project for reference.

---

## 10. Open questions to revisit

- With the batched design (17 LLM calls per assessment, regardless of chunk count), is a single final reveal fine, or is streaming results in per-archetype still worth it for perceived speed?
- At school scale (Milestone 4), should persona weights be adjustable per-teacher (e.g. a teacher of an ELL-heavy class might want that axis back in), or kept fixed for consistency?
- Should re-submitting a revised lesson plan support a "diff" view against the previous assessment, to show whether a specific fix worked?
