# Trip Planner — User Flow (v1)

**Stack:** React (Vite) frontend + FastAPI (Python) backend
**Trip length:** Fixed at 3 days (not user-configurable)
**Prompt limit:** 15-500 characters, enforced on frontend and backend

---

## Flow Diagram

```mermaid
flowchart TD
    A[Landing: prompt input + busy level picker] --> B{Region named literally in prompt?}
    B -- Yes --> C[Filter dataset to matched region - code only]
    B -- No --> D[LLM picks one region from dataset]
    D --> C
    C --> E[LLM Call #1: Place Selection]
    E --> F{Enough places matched target count?}
    F -- No --> G["Show message: Only N places matched -\nbroaden interests or busy level?"]
    G --> A
    F -- Yes --> H[Render map with pins + reason on each card]
    H --> I{User action}
    I -- "Click pin" --> J[Show detail card: hours, price, rating,\nseasonal_notes badge, booking_required,\nLLM reason]
    J --> I
    I -- "X a pin" --> K[Drop place - client-side only]
    K --> I
    I -- "Make Changes" --> L[Prompt box reappears - 15-500 char limit]
    L --> M{New prompt resolves to a\nregion/city/landmark outside the locked region?}
    M -- Yes --> N["Show message: That's outside your selected\nregion - start a new trip if you want it"]
    N --> I
    M -- No --> O[LLM Call #2: Refine Selection\nsame schema/validation, region-locked]
    O --> H
    I -- "Approve" --> P{Enough places remain for\n3-day / busy-level minimum?}
    P -- No --> Q["Approve disabled + message:\nAdd N more places to approve"]
    Q --> I
    P -- Yes --> R[Generate Itinerary - code only, no LLM]
    R --> S[Day-cluster by proximity within\nbusy-level per-day cap]
    S --> T[Nearest-neighbor order within each day]
    T --> U[Soft warning badges for hours-overlap conflicts]
    U --> V[Final itinerary view: day-by-day,\nnumbered/colored pins on an interactive map,\nfull place details, per-day directions link]
```

---

## Step-by-Step Breakdown

### 1. Landing / Prompt Input
- Free-text box: trip vibes, interests, place types (e.g. *"relaxing coastal trip, love local food, into wine and quiet towns, not really a museum person"*)
- **15-500 character limit**, enforced with a live counter (e.g. `342/500`) and a "tell us a bit more" hint below the minimum; submit disabled outside that range
- Busy-level picker (single select):
  | Level | Places/day | Total (3 days) |
  |---|---|---|
  | Chill | 2-3 | 6-9 |
  | Busy | 4-5 | 12-15 |
  | Packed | 6+ | 18+ |
- Trip length is fixed at 3 days — not shown as a user input

### 2. Region Resolution (pre-LLM, code-only)
- Backend checks the initial prompt text against known **region names** in `italy.json` (not cities or landmarks at this step)
- Match found → filter dataset to that region immediately, no LLM call
- No match (vibe text, or a city/landmark mentioned instead of a region) → LLM's first job is picking one region from the distinct regions present in the data
- Either path: region is **locked in code** before place selection runs — never enforced by prompt instruction alone

### 3. Place Selection — LLM Call #1
- Input: filtered subset (id, name, type, tags, description, rating, price_range) + user prompt + target place count
- Output: structured `{id, reason}` pairs (schema/tool-calling enforced)
- Backend validates every returned `id` exists in the filtered dataset before rendering anything
- **Narrow-match handling:** if matched places fall short of the target count, don't force a bad selection — show *"Only 8 places matched — want to broaden your interests or busy level?"* and return the user to the prompt input

### 4. Map Render
- Pins placed at each selected place's lat/long
- Click a pin → detail card showing: description, hours, price, rating, `seasonal_notes` as a warning badge (if present), `booking_required` flag (if true), and the **LLM's `reason`** for the pick

### 5. Review / Edit Loop
- **X a pin** → drop it from the working set (client-side state only, no LLM call)
- **Make Changes** → prompt box reappears (same 15-500 char limit) → new prompt text + current place ID list + region-lock context sent to backend
  - **Out-of-region check:** unlike Step 2's region-name-only check, this one escalates through region name → city name → every place name in the full (all-region) dataset, so a city ("add the Colosseum in Rome") or a bare landmark ("add the Colosseum") is caught, not just an explicit region name. If it resolves to a region other than the locked one, don't silently drop the request — show *"That's outside your selected region (Tuscany). If you would like to switch to Lazio instead, please start a new trip."* There's no in-place "switch region" action; the user restarts manually if they want it.
  - Otherwise → **LLM Call #2** (same schema, same ID validation), region-lock passed as an explicit hard instruction, not implied context
- Loop as many times as needed

### 6. Approve → Itinerary Generation (code-only, no LLM)
- **Minimum-count gate:** if the remaining places can't fill 3 days at the chosen busy level, Approve is disabled with a message like *"Add 2 more places to approve"* (`selectApproveGate` computes the current count and required minimum; the header renders the gap between them).
- Day-clustering by proximity, respecting the busy-level per-day place cap
- Nearest-neighbor ordering within each day
- Soft warning badges for hours-overlap conflicts between neighboring places (no hard rejection)
- **Final view:**
  - An interactive overview map (zoomable/pannable, like the map screen) with one numbered pin per place, colored by day. Each day's timeline list uses the same color/number on its own dots, so pins and list entries cross-reference directly — no separate legend needed.
  - Clicking a pin or a timeline entry selects it: the matching timeline entry highlights, and the map flies to that place (zooming in at least to street level if it isn't already), in either direction.
  - Each day has one "Directions" link (not one per place) that opens Google Maps with the whole day as a route — first place as the origin, last as the destination, everything between as waypoints, in visit order.
  - Full place details — description, hours, seasonal notes, booking requirement — are shown inline for every place, always visible rather than click-to-expand, since **Export PDF** (`window.print()`) captures whatever's on the page, and this is what people actually reference during the trip.

---

## Locked Decisions Reference

- Trip length: **always 3 days**
- Busy level defines **place count per day**, not hour budgets
- Region is chosen once (by user text or LLM) and **locked in code** for the rest of the session
- Itinerary generation is **fully deterministic** — no LLM call, to keep feasibility math reliable
- Prompt limit: **15-500 characters**, validated on both frontend and backend
- Same prompt-input component/validator reused for both initial input and refinement input
- Out-of-region requests during refinement surface a message and require the user to manually start a new trip — there is no automatic "switch region" action