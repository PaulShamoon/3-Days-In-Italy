import { fetchJson } from './client'

/**
 * POST /select — resolve a region and select an initial set of places.
 *
 * Args:
 *   promptText (string): The traveler's free-text trip request.
 *   busyLevel (string): "chill" | "busy" | "packed".
 *
 * Returns:
 *   Promise<object>: The SelectionResponse body.
 */
export function postSelect({ promptText, busyLevel }) {
  return fetchJson('/select', {
    method: 'POST',
    body: {
      prompt: { text: promptText },
      busy_level: busyLevel,
    },
  })
}

/**
 * POST /refine — apply a follow-up prompt against the current selection.
 *
 * Args:
 *   promptText (string): The traveler's follow-up request.
 *   lockedRegion (string): The region the trip is locked to.
 *   currentPlaceIds (string[]): The IDs of the currently selected places.
 *   busyLevel (string): "chill" | "busy" | "packed".
 *
 * Returns:
 *   Promise<object>: The RefineResponse body.
 */
export function postRefine({ promptText, lockedRegion, currentPlaceIds, busyLevel }) {
  return fetchJson('/refine', {
    method: 'POST',
    body: {
      prompt: { text: promptText },
      locked_region: lockedRegion,
      current_place_ids: currentPlaceIds,
      busy_level: busyLevel,
    },
  })
}
