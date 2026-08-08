import { fetchJson } from './client'

/**
 * GET /places?region=X — full place details for every place in a region.
 *
 * Args:
 *   region (string): The region to fetch places for.
 *
 * Returns:
 *   Promise<object>: The PlacesResponse body.
 */
export function getPlaces(region) {
  return fetchJson(`/places?region=${encodeURIComponent(region)}`)
}
