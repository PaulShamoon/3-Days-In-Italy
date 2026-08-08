# 3 Days in Italy

A trip planner that turns a free-text prompt ("relaxing coastal trip, love local
food, into wine and quiet towns, not really a museum person") into a real,
day-by-day 3-day Italy itinerary — one region, a hand-picked set of places, and
a map to go with it.

- **Backend:** FastAPI (Python) — LLM-driven place selection/refinement via the
  Anthropic API, plus a fully deterministic (no-LLM) itinerary builder.
- **Frontend:** React (Vite) — real `react-leaflet`/OpenStreetMap map, no mock data.

## Live demo

**[3-days-in-italy.vercel.app](https://3-days-in-italy.vercel.app)**

The backend runs on Render's free tier, which spins down after 15 minutes of
inactivity — if the site's been idle, the first prompt submission can take up
to a minute to respond while it wakes back up. It's not broken, just cold;
subsequent requests are fast.

## How it works

1. **Describe your trip.** Free-text prompt + a busy-level pick (Chill / Busy /
   Packed, which controls places-per-day). Trip length is fixed at 3 days.
2. **Region lock.** If your prompt names a place, the region is resolved in
   code immediately; otherwise the LLM picks one region from the dataset. Either
   way, the region is locked before place selection runs and enforced in code
   for the rest of the session — not just requested from the model.
3. **Place selection.** An LLM call picks places from the locked region's
   dataset, grounded in place IDs (never free-text names), and every returned ID
   is validated against the dataset before anything renders.
4. **Review on the map.** Click a pin or list card for details (hours, price,
   rating, seasonal notes, booking requirements, and the LLM's reasoning for
   picking it). Remove places inline, or open **Make changes** to submit a
   follow-up prompt that refines the selection (still region-locked — a request
   for somewhere outside the region surfaces a message instead of silently
   guessing).
5. **Approve → itinerary.** Once you have enough places for a 3-day trip at your
   busy level, Approve builds the final itinerary — entirely in code, no LLM:
   places are clustered by day via geographic proximity, ordered within each day
   by nearest-neighbor, with soft warning badges for any tight/overlapping hours.

See [`docs/user_flow.md`](docs/user_flow.md) for the full flow diagram and
[`docs/architectural_decisions.md`](docs/architectural_decisions.md) for the
reasoning behind these choices.

## Prerequisites

- Python >= 3.11 and [uv](https://docs.astral.sh/uv/)
- Node >= 18 and npm
- An [Anthropic API key](https://console.anthropic.com/) (place selection and
  refinement call the Anthropic API; the server starts without one, but those
  two calls will fail)

## Setup

1. **Install backend dependencies** (from the repo root):

   ```
   uv sync
   ```

2. **Add your API key.** Create a `.env` file at the repo root:

   ```
   ANTHROPIC_API_KEY=your-key-here
   ```

3. **Install frontend dependencies:**

   ```
   cd frontend && npm install
   ```

## Running it

Two servers, two terminals, both from the repo root:

```
# Terminal 1 — backend (http://localhost:8000, docs at /docs)
uv run uvicorn backend.main:app --reload

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Then open `http://localhost:5173`. The frontend talks to the backend at
`http://localhost:8000` by default; override with `VITE_API_BASE_URL` if
you're running the backend elsewhere.

See [`backend/readme.md`](backend/readme.md) for backend-specific notes
(CORS, dataset loading, endpoint reference).

## Testing

```
# Backend test suite
uv run pytest backend/

# Frontend unit tests (state machine, selectors, utils) + lint
cd frontend && npm run test && npm run lint
```

## Project structure

```
backend/    FastAPI app — routes, models, LLM calls, itinerary logic, tests
frontend/   React (Vite) app — screens, state machine, API client
docs/       Design/architecture docs — user flow, decision rationale
```
