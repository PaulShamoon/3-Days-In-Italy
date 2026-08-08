import { createContext, useContext } from 'react'
import { useTripState } from './useTripState'

const TripStateContext = createContext(null)

/**
 * Wraps the app in the trip-planning state machine, exposed via
 * context so deeply-nested components (e.g. TripMap -> PlaceMarker)
 * don't need state/dispatch threaded through every intermediate layer.
 */
export function TripStateProvider({ children }) {
  const tripState = useTripState()
  return <TripStateContext.Provider value={tripState}>{children}</TripStateContext.Provider>
}

/**
 * Read the trip state and its action dispatchers. Must be called from
 * within a TripStateProvider.
 *
 * Returns:
 *   object: The same shape useTripState() returns — { state, ...actions }.
 */
export function useTripStateContext() {
  const context = useContext(TripStateContext)
  if (context === null) {
    throw new Error('useTripStateContext must be used within a TripStateProvider')
  }
  return context
}
