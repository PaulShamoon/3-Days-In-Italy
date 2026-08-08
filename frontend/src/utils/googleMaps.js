/**
 * Build a Google Maps directions URL for an entire day's route — the
 * first place as the origin, the last as the destination, and everything
 * in between added as waypoints, all in the day's visit order. Falls
 * back to a plain single-destination link when there's only one place,
 * since a route needs at least two points.
 *
 * Args:
 *   places (Array<{latitude: number, longitude: number}>): The day's places, in visit order.
 *
 * Returns:
 *   string: A Google Maps directions URL covering the whole day.
 */
export function googleMapsDayRouteUrl(places) {
  if (places.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${places[0].latitude},${places[0].longitude}`
  }

  const coords = places.map((place) => `${place.latitude},${place.longitude}`)
  const waypoints = coords.slice(1, -1)

  const params = new URLSearchParams({
    api: '1',
    origin: coords[0],
    destination: coords[coords.length - 1],
  })
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'))
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}
