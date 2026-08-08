# Backend — 3 Days in Italy

FastAPI backend for the trip planner: place selection/refinement via the
Anthropic API, plus a deterministic (no-LLM) itinerary builder.

## Requirements

- Python >= 3.11
- [uv](https://docs.astral.sh/uv/) for dependency management

## Setup

1. From the **repo root** (not this `backend/` directory), install dependencies:

   ```
   uv sync
   ```

   This creates/updates a `.venv` at the repo root from `pyproject.toml`/`uv.lock`.

2. Create a `.env` file at the **repo root** with:

   ```
   ANTHROPIC_API_KEY=your-key-here
   ```

   Without a real key, the server still starts, but `/select` and `/refine`
   will fail when they actually call the Anthropic API.

## Running the server

Run from the **repo root**, not from inside `backend/` — the code uses
absolute `backend.*` imports, so `backend` needs to resolve as a top-level
package:

```
source .venv/bin/activate
uvicorn backend.main:app --reload
```

The API is served at `http://localhost:8000`. Interactive docs (Swagger UI)
are at `http://localhost:8000/docs`.

## Endpoints

- `POST /select` — initial prompt + busy level → region + selected places
- `POST /refine` — follow-up prompt against the current selection
- `POST /itinerary` — approved place IDs → deterministic 3-day plan

Request/response shapes are defined in `backend/models.py`.

## Deployment

Deployed on [Render](https://render.com) as a free-tier web service — see
`render.yaml` at the repo root for the exact build/start commands
(`pip install -r requirements.txt` / `uvicorn backend.main:app --host 0.0.0.0
--port $PORT`). `requirements.txt` (also at the repo root) is what Render's
build actually installs from; local dev still uses `uv`/`pyproject.toml`/
`uv.lock` as described above, so keep both in sync if dependencies change.

Vercel was tried first for the backend too, but its Python support runs as a
per-request serverless function with an execution-time ceiling that the
Anthropic API calls in `/select`/`/refine` can exceed on a cold start — see
`docs/architectural_decisions.md` for the full reasoning behind switching to
Render.

## Notes for local dev

- CORS allows `http://localhost:5173` (the frontend's Vite dev server
  default) and the deployed frontend's origin — update `backend/main.py`'s
  `allow_origins` if you're running the frontend somewhere else.
- The dataset (`backend/data/italy.json`) is loaded, encoding-corrected, and
  validated once at startup — a malformed entry will fail fast rather than
  surfacing as a runtime error later.
