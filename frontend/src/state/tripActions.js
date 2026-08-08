export const ACTION_TYPES = {
  PROMPT_CHANGED: 'PROMPT_CHANGED',
  BUSY_LEVEL_CHANGED: 'BUSY_LEVEL_CHANGED',

  SELECT_PENDING: 'SELECT_PENDING',
  SELECT_SUCCEEDED: 'SELECT_SUCCEEDED',
  SELECT_FAILED: 'SELECT_FAILED',

  PLACES_PENDING: 'PLACES_PENDING',
  PLACES_SUCCEEDED: 'PLACES_SUCCEEDED',
  PLACES_FAILED: 'PLACES_FAILED',

  PLACE_SELECTED: 'PLACE_SELECTED',
  REMOVE_REQUESTED: 'REMOVE_REQUESTED',
  REMOVE_CANCELLED: 'REMOVE_CANCELLED',
  REMOVE_CONFIRMED: 'REMOVE_CONFIRMED',

  CHANGES_OPENED: 'CHANGES_OPENED',
  CHANGES_CLOSED: 'CHANGES_CLOSED',
  CHANGES_TEXT_CHANGED: 'CHANGES_TEXT_CHANGED',

  REFINE_PENDING: 'REFINE_PENDING',
  REFINE_SUCCEEDED: 'REFINE_SUCCEEDED',
  REFINE_OUT_OF_REGION: 'REFINE_OUT_OF_REGION',
  REFINE_FAILED: 'REFINE_FAILED',

  ITINERARY_PENDING: 'ITINERARY_PENDING',
  ITINERARY_SUCCEEDED: 'ITINERARY_SUCCEEDED',
  ITINERARY_FAILED: 'ITINERARY_FAILED',

  BACK_TO_MAP: 'BACK_TO_MAP',
  TRIP_RESTARTED: 'TRIP_RESTARTED',
}

export const promptChanged = (text) => ({ type: ACTION_TYPES.PROMPT_CHANGED, payload: { text } })
export const busyLevelChanged = (busyLevel) => ({ type: ACTION_TYPES.BUSY_LEVEL_CHANGED, payload: { busyLevel } })

export const selectPending = () => ({ type: ACTION_TYPES.SELECT_PENDING })
export const selectSucceeded = (response) => ({ type: ACTION_TYPES.SELECT_SUCCEEDED, payload: response })
export const selectFailed = (error) => ({ type: ACTION_TYPES.SELECT_FAILED, payload: { error } })

export const placesPending = () => ({ type: ACTION_TYPES.PLACES_PENDING })
export const placesSucceeded = (placeCatalog) => ({ type: ACTION_TYPES.PLACES_SUCCEEDED, payload: { placeCatalog } })
export const placesFailed = (error) => ({ type: ACTION_TYPES.PLACES_FAILED, payload: { error } })

export const placeSelected = (id) => ({ type: ACTION_TYPES.PLACE_SELECTED, payload: { id } })
export const removeRequested = (id) => ({ type: ACTION_TYPES.REMOVE_REQUESTED, payload: { id } })
export const removeCancelled = () => ({ type: ACTION_TYPES.REMOVE_CANCELLED })
export const removeConfirmed = (id) => ({ type: ACTION_TYPES.REMOVE_CONFIRMED, payload: { id } })

export const changesOpened = () => ({ type: ACTION_TYPES.CHANGES_OPENED })
export const changesClosed = () => ({ type: ACTION_TYPES.CHANGES_CLOSED })
export const changesTextChanged = (text) => ({ type: ACTION_TYPES.CHANGES_TEXT_CHANGED, payload: { text } })

export const refinePending = () => ({ type: ACTION_TYPES.REFINE_PENDING })
export const refineSucceeded = (selected) => ({ type: ACTION_TYPES.REFINE_SUCCEEDED, payload: { selected } })
export const refineOutOfRegion = (message) => ({ type: ACTION_TYPES.REFINE_OUT_OF_REGION, payload: { message } })
export const refineFailed = (error) => ({ type: ACTION_TYPES.REFINE_FAILED, payload: { error } })

export const itineraryPending = () => ({ type: ACTION_TYPES.ITINERARY_PENDING })
export const itinerarySucceeded = (days) => ({ type: ACTION_TYPES.ITINERARY_SUCCEEDED, payload: { days } })
export const itineraryFailed = (error) => ({ type: ACTION_TYPES.ITINERARY_FAILED, payload: { error } })

export const backToMap = () => ({ type: ACTION_TYPES.BACK_TO_MAP })
export const tripRestarted = () => ({ type: ACTION_TYPES.TRIP_RESTARTED })
