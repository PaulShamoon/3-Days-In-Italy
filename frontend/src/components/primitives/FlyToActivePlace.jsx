import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export const ACTIVE_PLACE_ZOOM = 15

/**
 * Flies the map to the active point's position whenever activePlaceId
 * changes, so places clustered close together can be told apart instead
 * of relying on the user to manually zoom/pan to find them. Zooms in at
 * least to ACTIVE_PLACE_ZOOM, but never zooms back out if already
 * closer than that. Must be rendered as a child of react-leaflet's
 * MapContainer (uses useMap()). Shared between the map screen's TripMap
 * and the itinerary screen's ItineraryOverviewMap.
 *
 * Args:
 *   points (Array<{id: string, position: [number, number]}>): The plotted pins.
 *   activePlaceId (string | null): The currently selected place's id, if any.
 */
export function FlyToActivePlace({ points, activePlaceId }) {
  const map = useMap()
  const activePoint = points.find((point) => point.id === activePlaceId)

  useEffect(() => {
    if (!activePoint) return
    map.flyTo(activePoint.position, Math.max(map.getZoom(), ACTIVE_PLACE_ZOOM))
    // Deliberately keyed on the id, not the point object -- a fresh
    // points array is built on every render, but we only want this to
    // fly when the *selected* place actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, activePoint?.id])

  return null
}
