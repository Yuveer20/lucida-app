# Lucida

Test a lesson plan against a simulated classroom of 500 students before teaching it.

A teacher pastes a lesson plan; Lucida chunks it into logical sections and runs 16 LLM
persona archetypes (4 academic tiers × 4 learning styles) through the whole lesson,
then scales the results to a simulated population of 500 students — surfacing where
the lesson will and won't land, for whom, and why.

## Stack

React (Vite) + Tailwind + Recharts frontend, Node/Express (TypeScript) backend, shared
types package, Groq (`llama-3.3-70b-versatile`) for chunking and persona simulation.
No database in Milestone 1 — everything is computed per-request, session only.

## Setup

```bash
npm install
cp .env.example .env   # then fill in GROQ_API_KEY
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001` (frontend
dev server proxies `/api/*` to the backend).

## Milestones

See `docs/` for the full PRD, milestone roadmap, and technical design doc. Currently
implemented: Milestone 0 (foundations) and Milestone 1 (core assessment loop / MVP).
