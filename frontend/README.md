# 3 Days in Italy — Frontend

React (Vite) frontend for the trip planner. Talks to the FastAPI backend over
a plain JSON API — no server-side rendering, no meta-framework.

For what the app does end-to-end, see the [repo root README](../readme.md).
This doc is scoped to running/developing the frontend on its own.

## Stack

- **React 19** (plain JS, no TypeScript) + **Vite**
- **CSS Modules** for styling, with design tokens as CSS custom properties
  (`src/styles/tokens.css`)
- **react-leaflet** + real OpenStreetMap tiles for the map (no API key required)
- No external state library — a `useReducer`-based state machine
  (`src/state/`), exposed via Context so deeply-nested components don't need
  props threaded through every layer

## Setup

```
npm install
```

## Running it

```
npm run dev
```

Serves at `http://localhost:5173`. Requires the backend running separately —
see the [backend README](../backend/readme.md) — at `http://localhost:8000`
by default. Point at a different backend URL with a `VITE_API_BASE_URL` env
var (e.g. in a local `.env` file, picked up automatically by Vite).

## Scripts

```
npm run dev       # dev server with HMR
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run lint      # eslint
```

## Project structure

```
src/
  main.jsx, App.jsx        entry point + stage router
  api/                      fetch wrapper + one module per backend endpoint group
  state/                    tripReducer (pure state machine) + useTripState
                             (async orchestration, the only place that calls api/)
                             + TripStateContext (avoids prop-drilling)
  components/
    primitives/              reusable, dumb building blocks (Button, Tag, PromptField, ...)
    layout/                  app header, shared across every screen
    input-screen/            prompt + busy-level picker
    loading-screen/          shown while /select (+ the follow-up /places) is in flight
    map-screen/               place list, map, make-changes panel
    itinerary-screen/         final day-by-day plan
  utils/                    pure helpers (joining selection + place catalog, formatting)
  styles/                   design tokens, fonts, global resets
```

Every non-trivial component has a co-located `.module.css` file.

## Notes for local dev

- The dev server's default port (`5173`) is the one the backend's CORS config
  allows by default — if you change it, update `backend/main.py` too.
- No test suite on the frontend side (backend has the pytest suite); `npm run
  lint` is the only automated check.
