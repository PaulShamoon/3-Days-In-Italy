The purpose of this document is to explain the architectural decisions I made and why.

# Tech Stack

## Backend
- Python
- FastAPI
- Anthropic Python SDK

I chose the above tech stack for the backend because I'm very familiar and experienced with Python and FastAPI, and it's the stack I use in production at my current role. Python also gives us access to Pydantic models for free, which double as a structured-output schema for the LLM calls — I define the response shape once and reuse it for validation on both the LLM output and the API layer. I chose the Anthropic Python SDK for its reliability, documentation quality, and native support for structured/tool-based output, which this project leans on heavily.

## Frontend
- React.js
- Vite

I chose the above tech stack for the frontend because I'm very familiar with React, and Vite gives a faster dev server and simpler build than alternatives like Create React App. With React, I also get access to react-leaflet for the map — a free, no-API-key-required mapping library, which matters for a take-home someone else needs to run without setting up billing or credentials.

## Deployment

Splitting frontend and backend into separate services means two deployments instead of one, but it keeps the concerns cleanly separated and mirrors how I'd actually structure a production system — a Python service owning data/AI logic, and a frontend consuming it over an API.
- Frontend → Vercel (static build), live at https://3-days-in-italy.vercel.app
- Backend → Render (free-tier web service), live at https://three-days-in-italy-backend.onrender.com
- CORS on FastAPI allows the deployed frontend's origin; the frontend points at the deployed backend URL via a `VITE_API_BASE_URL` env var

**Why not Vercel for the backend too:** I initially deployed the FastAPI backend on Vercel as well, mainly for the simplicity of one platform. That didn't hold up in practice. Vercel's Python support runs as a per-request serverless function with an execution-time ceiling (the free tier caps around 10 seconds), but `/select` and `/refine` aren't quick lookups — they make a real round-trip to the Anthropic API, which can exceed that ceiling on a cold start. When it does, Vercel kills the connection mid-request rather than returning a normal error response, which surfaces to the user as a generic, unexplained "failed to fetch." Render runs the backend as a normal always-on process (the same `uvicorn` command as local dev), so there's no per-request duration limit to fight in the first place. The tradeoff is a free-tier spin-down after 15 minutes idle, which delays the first request after a gap by up to a minute rather than breaking it outright — a much safer failure mode for something a reviewer might open cold.

---

# Data & LLM Grounding

## Grounding the LLM in place IDs, not names

The dataset provides a unique `id` per place. Every LLM call that selects places returns `{id, reason}` pairs rather than free-text names — this avoids hallucinated or fuzzy-matched places entirely. The backend validates every returned ID against the dataset before anything is rendered to the user; any ID that doesn't match is dropped rather than trusted.

## Structured output over free-text parsing

All LLM responses use a schema-constrained/tool-calling format (backed by Pydantic models) instead of parsing prose. This makes selection and refinement diffable — adding or removing a place is just an ID list comparison — and removes an entire class of parsing bugs.

## Surfacing "unclean" data instead of hiding it

The brief calls out that the dataset is intentionally messy (seasonal hours, incomplete fields, inconsistencies). Rather than silently working around this, I surface it directly in the product: a warning badge when `seasonal_notes` is present, and a flag when `booking_required` is true. I treated this as a product signal, not just a data-cleaning problem to hide from the user.

---

# Region Locking

A single trip is locked to one region, enforced in code rather than left to the LLM's judgment:
- If the user's initial prompt names a region directly, the dataset is filtered immediately, with no LLM call needed for this step.
- If the prompt is vibe-only (or names something other than a region), the LLM's first job is picking one region from the distinct regions present in the data.
- Either way, the resulting region is used to filter the dataset in code before any place-selection call runs.

I made this an explicit code-level constraint rather than a prompt instruction because it's a hard requirement (Italy is too large to cross day-to-day in a 3-day trip), and hard requirements should be enforced structurally, not requested from the model. The same lock is passed as an explicit instruction (not just implied context) during the refinement step, since models are more reliable at honoring stated constraints than inferred ones.

**Out-of-region requests during refinement:** a region-name-only check isn't enough here — a refinement prompt is far more likely to name a city ("add the Colosseum in Rome") or a bare landmark ("add the Colosseum") than a region outright, and neither would trip a region-name check. So `/refine`'s out-of-region guard escalates in order of specificity — region name, then city name, then every place name in the full (all-region) dataset — and resolves whichever one confidently matches back to its region. If that resolves to a region other than the locked one, the request isn't silently dropped or complied with: the response surfaces the conflict with a message telling the user to start a new trip if they want that region instead. There's no automatic "switch region and restart" — auto-switching would discard the user's current selection without confirmation, so the decision is deliberately left to the user rather than building a confirm-and-restart flow for it. This code-only pass is also a best-effort guard, not a substitute for the region-lock instruction the LLM call still receives — a landmark the dataset doesn't itself contain can still slip through.

---

# Busy Level as Place Count, Not Time Budget

Trip pacing (Chill / Busy / Packed) is defined as a fixed number of places per day rather than a hard time budget summed from `duration_minutes`. This was a deliberate simplification: a clock-based budget requires solving a harder feasibility problem (bin-packing against opening hours) for marginal benefit. A place-count cap is simpler to reason about, easier to validate, and still produces a sensible itinerary. Where time/hours conflicts do matter, I handle them as soft warning badges on the final itinerary rather than hard constraints during generation.

---

# Deterministic Itinerary Generation (No LLM)

Once a fixed set of places is approved, generating the final day-by-day itinerary is handled entirely in code — day-clustering by geographic proximity within the busy-level's per-day cap, followed by nearest-neighbor ordering within each day. I chose not to hand this step to the LLM because place selection is a fuzzy matching problem the model is well-suited for, while feasibility and ordering are deterministic problems where I want reliable, reproducible output. This also means the itinerary step is fast, free, and testable without mocking an LLM call.

---

# Input Validation

The prompt input (both initial and refinement) is capped at 500 characters. I chose a character limit over a word limit because word count is a poor proxy for actual token usage — a handful of very long words can cost as much as many short ones, while character count maps much more directly to LLM cost and context size. The limit is enforced identically on both ends: client-side for immediate feedback (a live counter, disabled submit), and server-side via a Pydantic field validator, since a client-only limit can be bypassed by anyone calling the API directly.

There's also a 15-character (whitespace-stripped) minimum on both prompts. A bare `min_length=1` lets something meaningless like "the" through, which hands the LLM nothing to actually select or refine against — rather than let the model guess at a near-empty prompt, the request is rejected before it reaches the LLM at all. 15 characters is deliberately low: enough to rule out throwaway input without feeling like a real constraint on genuine (if terse) requests like "add more wine bars." It's enforced the same way as the max — client-side gating plus a server-side Pydantic validator, which strips whitespace before counting so padding can't be used to sneak a short prompt past the check.

---

# Handling Insufficient Matches

Two points in the flow can produce too few places for the trip's requirements, and both are handled explicitly rather than silently failing:
- **After selection:** if fewer places match the prompt than the busy-level target requires, the user is told how many matched and offered the choice to broaden their interests or lower the busy level, rather than being handed an incomplete or padded selection.
- **Before approval:** if the user has removed enough places (via the X action) that the remaining set can't fill a 3-day itinerary at their chosen busy level, the Approve action is disabled with a message stating the minimum required, rather than allowing an itinerary with empty or sparse days.