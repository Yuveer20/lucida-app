# Lucida

Test a lesson plan against a simulated classroom before you ever teach it.

A teacher pastes a lesson plan. Lucida splits it into logical chunks and runs
three kinds of agent over it — a simulated classroom of 18 student profiles, an
experienced teacher, and a learning scientist — then grounds-checks its own
output before showing anything. The result is a tiered report: what to fix
first, then a chunk-by-chunk ledger, then full per-chunk detail with a
revise-and-recheck loop.

**Status:** Milestone 1 (core assessment loop). See [docs/Milestone_Roadmap.md](docs/Milestone_Roadmap.md).

---

## Setup

```bash
npm install
cp .env.example .env      # then add ANTHROPIC_API_KEY and/or GROQ_API_KEY
npm run dev
```

Either key alone is enough to run. **`ANTHROPIC_API_KEY` takes priority when both are
set** — so a common flow is: get running on `GROQ_API_KEY` now, add `ANTHROPIC_API_KEY`
whenever you get one, and every boot after that switches over automatically. See
[Technical_Design.md §1b](docs/Technical_Design.md) for why Groq exists at all and what
it trades away — it's a real stopgap, not a fully equivalent second option.

- Frontend: http://localhost:5173
- API: http://localhost:3001 (`GET /api/health` reports the active `provider`, whether it's
  configured, and the projected call count for the current `.env`)

An assessment runs ~21-22 model calls by default and takes a minute or two. Student Agents
are the cost centre — they're 18 of those calls and, since thinking tokens dominate spend,
the majority of the token cost too. `.env.example` documents three independent levers
(`LUCIDA_STUDENT_MODEL`, `LUCIDA_PERSONAS_PER_CALL`, `LUCIDA_STUDENT_PASSES`) — see
[Technical_Design.md §4.9](docs/Technical_Design.md) for what each one trades away. Default
model is Sonnet 5, not Opus — near-Opus quality on this kind of structured task at roughly
half the price, and cost matters more here than on a typical assistant because every
Student Agent call pays it again.

**Cost protection, in layers:** `/api/assess` and `/api/recheck` require a verified Firebase
sign-in (`FIREBASE_SERVICE_ACCOUNT` — see `.env.example`); a per-account rate limit
(`LUCIDA_RATE_LIMIT_MAX_ASSESS`, default 5/15min); and a global limit shared across every
account combined (`LUCIDA_GLOBAL_DAILY_MAX_ASSESS`, default 80/day), so creating several
accounts doesn't multiply the quota. The global limit is in-memory and resets on a
redeploy — it is not a hard platform guarantee. **For an actual unbypassable ceiling,
set a spend limit in the Anthropic Console**: platform.claude.com → Workspaces → the
workspace this app's API key belongs to → **Limits** tab → **Change Limit**. That's
enforced by Anthropic itself regardless of anything in this app's code, and is worth
doing once regardless of how the app-level limits above are tuned.

## Layout

| Path | What it is |
|---|---|
| `shared/` | Types shared by both ends — the API contract |
| `backend/src/config/` | Personas, principles, agent roles, dimension weights — all data, not prompt strings |
| `backend/src/chunking/` | Lesson → logical sections |
| `backend/src/agents/` | Student, teacher, expert, disagreement detection, QA pass |
| `backend/src/aggregation/` | Confidence ranges, dimension breakdowns, headline recommendations |
| `backend/src/pipeline/` | The assessment loop and the recheck loop |
| `frontend/src/ds/` | Lucida Design System, ported to typed TSX |
| `frontend/src/screens/` | Upload → processing → results → chunk drill-down |

## Design decisions worth knowing

**The learning-styles model is gone.** The original design crossed 4 academic
tiers × 4 VARK learning styles. The learning-style axis has no predictive
effect on comprehension in controlled testing, so it was dropped entirely and
replaced with ten evidence-backed dimensions. Sources are in
[docs/Technical_Design.md §8](docs/Technical_Design.md).

**Ethnicity and gender are not dimensions.** Neither predicts comprehension.
Including either would mean fabricating an outcome pattern with no evidentiary
basis, which would undermine the premise of the whole tool. Content-level
effects sometimes associated with those categories — stereotype threat from how
a task is framed, say — are flagged by the Expert Agent as properties of the
*lesson*, never as traits of a simulated student.

**Personas are curated, not crossed.** Ten dimensions crossed mechanically
would be 500+ archetypes: cost-prohibitive, and less realistic, because it
would treat correlated traits (income and parental education) as independent.
The 18 profiles in `backend/src/config/personas.ts` are hand-designed
combinations that actually co-occur in classrooms.

**Comprehension is a range, never a number.** These are simulated reactions,
not measured data. Each profile runs twice and the spread between passes sets
the width of the band; profiles that disagree with themselves get flagged as
unsettled rather than averaged into false confidence.

**Every expert claim is traceable.** The Expert Agent must name a principle
from the registry in `backend/src/config/principles.ts` for every point it
raises. An unregistered principle is rejected — the agent cannot invent a
plausible-sounding rule and present it as research.

**Disagreements are shown, not resolved.** Where the teacher's practical read
and the expert's research read conflict, both are displayed side by side.
That tradeoff is the product, not a bug to smooth over.

**Styling is the design system's token layer, not Tailwind.** See
[Technical_Design.md §1a](docs/Technical_Design.md) for why, and for why there
is no chart library.

## Scripts

```bash
npm run dev         # backend + frontend
npm run build       # shared → backend → frontend
npm run typecheck
npm run lint
```
