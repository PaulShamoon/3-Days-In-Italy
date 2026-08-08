import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import { DAY_COLORS } from '../../utils/dayColors'
import styles from './ItineraryOverviewMap.module.css'

/**
 * Small, read-only overview map — one dot per place, colored by day,
 * no popups or click interaction (the interactive map is the map
 * screen's TripMap, already reviewed before Approve).
 *
 * Args:
 *   days (Array<object>): ItineraryResponse.days.
 */
export function ItineraryOverviewMap({ days }) {
  const points = useMemo(
    () =>
      days.flatMap((day, dayIndex) =>
        day.places.map((place) => ({
          id: place.id,
          position: [place.latitude, place.longitude],
          color: DAY_COLORS[dayIndex % DAY_COLORS.length],
        }))
      ),
    [days]
  )

  if (points.length === 0) return null

  const bounds = points.map((point) => point.position)

  return (
    <div className={styles.map}>
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [24, 24] }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        className={styles.container}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {points.map((point) => (
          <CircleMarker
            key={point.id}
            center={point.position}
            radius={7}
            pathOptions={{ color: '#fff', weight: 1.5, fillColor: point.color, fillOpacity: 1 }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
