import { useMemo } from 'react'
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet'
import { PlaceMarker } from './PlaceMarker'
import styles from './TripMap.module.css'

/**
 * Real Leaflet + OpenStreetMap map, fit to the given places' bounds,
 * with one interactive PlaceMarker per place.
 *
 * Args:
 *   places (Array<object>): Merged WorkingPlace[] to plot.
 */
export function TripMap({ places }) {
  const bounds = useMemo(() => places.map((place) => [place.latitude, place.longitude]), [places])

  if (places.length === 0) {
    return <div className={styles.map} />
  }

  return (
    <div className={styles.map}>
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [40, 40] }}
        zoomControl={false}
        className={styles.container}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ZoomControl position="topleft" />
        {places.map((place) => (
          <PlaceMarker key={place.id} place={place} />
        ))}
      </MapContainer>
    </div>
  )
}
