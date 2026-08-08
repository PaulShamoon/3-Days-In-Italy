import { useEffect, useMemo } from 'react'
import { MapContainer, ZoomControl, useMap } from 'react-leaflet'
import { useTripStateContext } from '../../state/TripStateContext'
import { OsmTileLayer } from '../primitives/OsmTileLayer'
import { FlyToActivePlace } from '../primitives/FlyToActivePlace'
import { PlaceMarker } from './PlaceMarker'
import styles from './TripMap.module.css'

const BOUNDS_OPTIONS = { padding: [40, 40] }

/**
 * MapContainer's `bounds` prop only fits the view once, at creation —
 * later prop changes are inert (see react-leaflet's MapContainer
 * source). This re-fits whenever `bounds` actually changes identity
 * (i.e. the places passed to TripMap changed), so a refine that adds
 * or removes places pans/zooms the map to keep them all in view.
 *
 * Args:
 *   bounds (Array<[number, number]>): Lat/lng pairs to fit the view to.
 */
function FitBounds({ bounds }) {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(bounds, BOUNDS_OPTIONS)
  }, [map, bounds])

  return null
}

/**
 * Real Leaflet + OpenStreetMap map, fit to the given places' bounds,
 * with one interactive PlaceMarker per place.
 *
 * Args:
 *   places (Array<object>): Merged WorkingPlace[] to plot.
 */
export function TripMap({ places }) {
  const { state } = useTripStateContext()
  const points = useMemo(
    () => places.map((place) => ({ id: place.id, position: [place.latitude, place.longitude] })),
    [places]
  )
  const bounds = useMemo(() => points.map((point) => point.position), [points])

  if (places.length === 0) {
    return <div className={styles.map} />
  }

  return (
    <div className={styles.map}>
      <MapContainer
        bounds={bounds}
        boundsOptions={BOUNDS_OPTIONS}
        zoomControl={false}
        className={styles.container}
      >
        <OsmTileLayer />
        <ZoomControl position="topleft" />
        <FitBounds bounds={bounds} />
        <FlyToActivePlace points={points} activePlaceId={state.activePlaceId} />
        {places.map((place) => (
          <PlaceMarker key={place.id} place={place} />
        ))}
      </MapContainer>
    </div>
  )
}
