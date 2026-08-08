import { useCallback, useReducer } from 'react'
import { tripReducer, initialState } from './tripReducer'
import * as actions from './tripActions'
import { postSelect, postRefine } from '../api/selectionApi'
import { postItinerary } from '../api/itineraryApi'
import { getPlaces } from '../api/placesApi'

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
  const [state, dispatch] = useReducer(tripReducer, initialState)

  const submitPrompt = useCallback(async () => {
    dispatch(actions.selectPending())

    let selectResponse
    try {
      selectResponse = await postSelect({
        promptText: state.promptText,
        busyLevel: state.busyLevel,
      })
    } catch (error) {
      dispatch(actions.selectFailed(error.message))
      return
    }

    dispatch(actions.selectSucceeded(selectResponse))
    if (selectResponse.insufficient_matches) return

    dispatch(actions.placesPending())
    try {
      const placesResponse = await getPlaces(selectResponse.region)
      const placeCatalog = {}
      placesResponse.places.forEach((place) => {
        placeCatalog[place.id] = place
      })
      dispatch(actions.placesSucceeded(placeCatalog))
    } catch (error) {
      dispatch(actions.placesFailed(error.message))
    }
  }, [state.promptText, state.busyLevel])

  const submitRefinement = useCallback(async () => {
    dispatch(actions.refinePending())
    try {
      const response = await postRefine({
        promptText: state.changesText,
        lockedRegion: state.region,
        currentPlaceIds: state.selection.map((selected) => selected.id),
        busyLevel: state.busyLevel,
      })

      if (response.out_of_region_request) {
        dispatch(actions.refineOutOfRegion(response.out_of_region_message))
      } else {
        dispatch(actions.refineSucceeded(response.selected))
      }
    } catch (error) {
      dispatch(actions.refineFailed(error.message))
    }
  }, [state.changesText, state.region, state.selection, state.busyLevel])

  const approveItinerary = useCallback(async () => {
    dispatch(actions.itineraryPending())
    try {
      const response = await postItinerary({
        placeIds: state.selection.map((selected) => selected.id),
        busyLevel: state.busyLevel,
      })
      dispatch(actions.itinerarySucceeded(response.days))
    } catch (error) {
      dispatch(actions.itineraryFailed(error.message))
    }
  }, [state.selection, state.busyLevel])

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
    restartTrip: () => dispatch(actions.tripRestarted()),
  }
}
