import { ACTION_TYPES } from './tripActions'

export const initialState = {
  stage: 'input', // 'input' | 'loading' | 'map' | 'itinerary'

  promptText: '',
  busyLevel: 'busy',

  region: null,
  selectMeta: null, // { matchedCount, targetCountMin, targetCountMax, insufficientMatches }

  selection: [], // SelectedPlace[] — {id, reason}
  placeCatalog: {}, // Record<id, Place>

  activePlaceId: null,
  pendingRemoveId: null,

  changesOpen: false,
  changesText: '',
  changesSubmitting: false,
  changesError: null,
  outOfRegionMessage: null,

  itinerary: null, // ItineraryDay[]

  selectStatus: 'idle', // 'idle' | 'pending' | 'error'
  selectError: null,
  placesStatus: 'idle',
  placesError: null,
  itineraryStatus: 'idle',
  itineraryError: null,
}

/**
 * Pure state-machine reducer for the whole trip-planning flow. Async
 * orchestration (the actual API calls) lives in useTripState.js, which
 * dispatches the *_PENDING/*_SUCCEEDED/*_FAILED actions this handles —
 * this function never awaits or calls fetch itself.
 *
 * Args:
 *   state (object): The current trip state.
 *   action (object): { type: string, payload?: object }.
 *
 * Returns:
 *   object: The next trip state.
 */
export function tripReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.PROMPT_CHANGED:
      return { ...state, promptText: action.payload.text }

    case ACTION_TYPES.BUSY_LEVEL_CHANGED:
      return { ...state, busyLevel: action.payload.busyLevel }

    case ACTION_TYPES.SELECT_PENDING:
      return { ...state, stage: 'loading', selectStatus: 'pending', selectError: null }

    case ACTION_TYPES.SELECT_SUCCEEDED: {
      const {
        region,
        selected,
        matched_count: matchedCount,
        target_count_min: targetCountMin,
        target_count_max: targetCountMax,
        insufficient_matches: insufficientMatches,
      } = action.payload

      const selectMeta = { matchedCount, targetCountMin, targetCountMax, insufficientMatches }

      if (insufficientMatches) {
        // Stay on the input screen — InputScreen renders the "only N
        // matched" banner from selectMeta instead of advancing.
        return { ...state, stage: 'input', selectStatus: 'idle', selectMeta }
      }

      // Stay on 'loading' — the follow-up GET /places call still needs
      // to succeed before there's full place data to show a map with.
      return { ...state, selectStatus: 'idle', region, selection: selected, selectMeta }
    }

    case ACTION_TYPES.SELECT_FAILED:
      return { ...state, stage: 'input', selectStatus: 'error', selectError: action.payload.error }

    case ACTION_TYPES.PLACES_PENDING:
      return { ...state, placesStatus: 'pending', placesError: null }

    case ACTION_TYPES.PLACES_SUCCEEDED:
      return { ...state, stage: 'map', placesStatus: 'idle', placeCatalog: action.payload.placeCatalog }

    case ACTION_TYPES.PLACES_FAILED:
      return { ...state, placesStatus: 'error', placesError: action.payload.error }

    case ACTION_TYPES.PLACE_SELECTED:
      return {
        ...state,
        activePlaceId: state.activePlaceId === action.payload.id ? null : action.payload.id,
      }

    case ACTION_TYPES.REMOVE_REQUESTED:
      return { ...state, pendingRemoveId: action.payload.id }

    case ACTION_TYPES.REMOVE_CANCELLED:
      return { ...state, pendingRemoveId: null }

    case ACTION_TYPES.REMOVE_CONFIRMED: {
      const { id } = action.payload
      return {
        ...state,
        selection: state.selection.filter((selected) => selected.id !== id),
        activePlaceId: state.activePlaceId === id ? null : state.activePlaceId,
        pendingRemoveId: null,
      }
    }

    case ACTION_TYPES.CHANGES_OPENED:
      return { ...state, changesOpen: true, changesText: '', changesError: null, outOfRegionMessage: null }

    case ACTION_TYPES.CHANGES_CLOSED:
      return { ...state, changesOpen: false, changesText: '', changesError: null, outOfRegionMessage: null }

    case ACTION_TYPES.CHANGES_TEXT_CHANGED:
      return { ...state, changesText: action.payload.text }

    case ACTION_TYPES.REFINE_PENDING:
      return { ...state, changesSubmitting: true, changesError: null, outOfRegionMessage: null }

    case ACTION_TYPES.REFINE_SUCCEEDED:
      return {
        ...state,
        selection: action.payload.selected,
        changesSubmitting: false,
        changesOpen: false,
        changesText: '',
      }

    case ACTION_TYPES.REFINE_OUT_OF_REGION:
      // selection is deliberately left untouched — backend's selected:
      // [] here is a no-op sentinel, not a real update.
      return { ...state, changesSubmitting: false, outOfRegionMessage: action.payload.message }

    case ACTION_TYPES.REFINE_FAILED:
      return { ...state, changesSubmitting: false, changesError: action.payload.error }

    case ACTION_TYPES.ITINERARY_PENDING:
      return { ...state, itineraryStatus: 'pending', itineraryError: null }

    case ACTION_TYPES.ITINERARY_SUCCEEDED:
      // Also closes the make-changes panel if it was left open — otherwise
      // it silently reappears open the next time the user returns to the
      // map screen via "Edit selection", without them reopening it.
      return {
        ...state,
        stage: 'itinerary',
        itineraryStatus: 'idle',
        itinerary: action.payload.days,
        changesOpen: false,
        changesText: '',
        changesError: null,
        outOfRegionMessage: null,
      }

    case ACTION_TYPES.ITINERARY_FAILED:
      return { ...state, itineraryStatus: 'error', itineraryError: action.payload.error }

    case ACTION_TYPES.BACK_TO_MAP:
      return { ...state, stage: 'map' }

    case ACTION_TYPES.TRIP_RESTARTED:
      return initialState

    default:
      return state
  }
}
