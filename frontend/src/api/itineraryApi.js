import { fetchJson } from './client'

/**
 * POST /itinerary — deterministically build the 3-day plan from the
 * approved place IDs.
 *
 * Args:
 *   placeIds (string[]): The approved place IDs.
 *   busyLevel (string): "chill" | "busy" | "packed".
 *
 * Returns:
 *   Promise<object>: The ItineraryResponse body.
 */
export function postItinerary({ placeIds, busyLevel }) {
  return fetchJson('/itinerary', {
    method: 'POST',
    body: {
      place_ids: placeIds,
      busy_level: busyLevel,
    },
  })
}
