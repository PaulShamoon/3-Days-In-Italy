import { useCallback, useEffect, useReducer, useRef } from 'react'
import { tripReducer, initialState } from './tripReducer'
import * as actions from './tripActions'
import { postSelect, postRefine } from '../api/selectionApi'
import { postItinerary } from '../api/itineraryApi'
import { getPlaces } from '../api/placesApi'

const STORAGE_KEY = 'tripState'

// Only the actual trip data is persisted — in-flight statuses/errors and
// modal/panel-open flags are excluded so a reload can't resurrect a stuck
// "pending" spinner or a make-changes panel hanging open with no request
// actually in flight.
const PERSISTED_KEYS = [
  'stage',
  'promptText',
  'busyLevel',
  'region',
  'selectMeta',
  'selection',
  'placeCatalog',
  'activePlaceId',
  'itinerary',
]

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    return { ...initialState, ...JSON.parse(raw) }
  } catch {
    return initialState
  }
}

function persistState(state) {
  const toPersist = {}
  PERSISTED_KEYS.forEach((key) => {
    toPersist[key] = state[key]
  })
  // 'loading' only means "a request is in flight" — with nothing in
  // flight after a fresh page load, it has to fall back to 'input' or
  // the user gets stuck looking at a permanent spinner.
  if (toPersist.stage === 'loading') toPersist.stage = 'input'

  localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist))
}

/**
 * Owns the trip-planning state machine (via tripReducer) and every
 * async side effect around it — this is the only place in the app
 * that calls the api/ layer. Components only ever see plain state and
 * callback functions, never fetch/Promise details directly
 *
 * Returns:
 *   object: { state, ...action dispatcher functions }.
 */
export function useTripState() {
  const [state, dispatch] = useReducer(tripReducer, undefined, loadPersistedState)

  useEffect(() => {
    persistState(state)
  }, [state])

  // Bumped by restartTrip so any async action already in flight from
  // before the restart can tell its response is stale once it resolves
  // and skip dispatching — otherwise a slow /select+/places or
  // /refine/itinerary chain can land after the user has already reset
  // and silently drag them back into the trip they just abandoned.
  const epochRef = useRef(0)

  const submitPrompt = useCallback(async () => {
    const epoch = epochRef.current
    dispatch(actions.selectPending())

    let selectResponse
    try {
      selectResponse = await postSelect({
        promptText: state.promptText,
        busyLevel: state.busyLevel,
      })
    } catch (error) {
      if (epochRef.current === epoch) dispatch(actions.selectFailed(error.message))
      return
    }

    if (epochRef.current !== epoch) return
    dispatch(actions.selectSucceeded(selectResponse))
    if (selectResponse.insufficient_matches) return

    dispatch(actions.placesPending())
    try {
      const placesResponse = await getPlaces(selectResponse.region)
      const placeCatalog = {}
      placesResponse.places.forEach((place) => {
        placeCatalog[place.id] = place
      })
      if (epochRef.current !== epoch) return
      dispatch(actions.placesSucceeded(placeCatalog))
    } catch (error) {
      if (epochRef.current === epoch) dispatch(actions.placesFailed(error.message))
    }
  }, [state.promptText, state.busyLevel])

  const submitRefinement = useCallback(async () => {
    const epoch = epochRef.current
    dispatch(actions.refinePending())
    try {
      const response = await postRefine({
        promptText: state.changesText,
        lockedRegion: state.region,
        currentPlaceIds: state.selection.map((selected) => selected.id),
        busyLevel: state.busyLevel,
      })

      if (epochRef.current !== epoch) return
      if (response.out_of_region_request) {
        dispatch(actions.refineOutOfRegion(response.out_of_region_message))
      } else {
        dispatch(actions.refineSucceeded(response.selected))
      }
    } catch (error) {
      if (epochRef.current === epoch) dispatch(actions.refineFailed(error.message))
    }
  }, [state.changesText, state.region, state.selection, state.busyLevel])

  const approveItinerary = useCallback(async () => {
    const epoch = epochRef.current
    dispatch(actions.itineraryPending())
    try {
      const response = await postItinerary({
        placeIds: state.selection.map((selected) => selected.id),
        busyLevel: state.busyLevel,
      })
      if (epochRef.current !== epoch) return
      dispatch(actions.itinerarySucceeded(response.days))
    } catch (error) {
      if (epochRef.current === epoch) dispatch(actions.itineraryFailed(error.message))
    }
  }, [state.selection, state.busyLevel])

  const restartTrip = useCallback(() => {
    epochRef.current += 1
    dispatch(actions.tripRestarted())
  }, [])

  return {
    state,
    setPromptText: (text) => dispatch(actions.promptChanged(text)),
    setBusyLevel: (busyLevel) => dispatch(actions.busyLevelChanged(busyLevel)),
    submitPrompt,
    selectPlace: (id) => dispatch(actions.placeSelected(id)),
    requestRemove: (id) => dispatch(actions.removeRequested(id)),
    cancelRemove: () => dispatch(actions.removeCancelled()),
    confirmRemove: (id) => dispatch(actions.removeConfirmed(id)),
    openChanges: () => dispatch(actions.changesOpened()),
    closeChanges: () => dispatch(actions.changesClosed()),
    setChangesText: (text) => dispatch(actions.changesTextChanged(text)),
    submitRefinement,
    approveItinerary,
    backToMap: () => dispatch(actions.backToMap()),
    restartTrip,
  }
}
