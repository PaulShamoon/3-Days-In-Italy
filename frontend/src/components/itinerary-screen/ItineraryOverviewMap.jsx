import { useMemo } from 'react'
import { MapContainer, Marker, ZoomControl } from 'react-leaflet'
import { DAY_COLORS } from '../../utils/dayColors'
import { OsmTileLayer } from '../primitives/OsmTileLayer'
import { FlyToActivePlace } from '../primitives/FlyToActivePlace'
import { createDayMarkerIcon } from './dayMarkerIcon'
import styles from './ItineraryOverviewMap.module.css'

/**
 * Overview map — one numbered pin per place, colored by day, zoomable
 * and pannable (like the map screen's TripMap) so pins clustered
 * together in one city can be told apart. The color/number pairing
 * matches each day's timeline dots (see DaySection/DayTimelineItem), so
 * there's no separate legend here — the timeline below already labels
 * each color as "Day N". No popups — the interactive map with full
 * place details is the map screen's TripMap, already reviewed before
 * Approve. Clicking a pin selects it (same activePlaceId as clicking a
 * timeline entry), highlighting the matching place in its day's list —
 * mirroring the map screen's pin-to-list sync.
 *
 * Args:
 *   days (Array<object>): ItineraryResponse.days.
 *   activePlaceId (string | null): The currently selected place's id (from a timeline click or pin click), if any.
 *   onSelectPlace (function): Called with a place's id when its pin is clicked.
 */
export function ItineraryOverviewMap({ days, activePlaceId, onSelectPlace }) {
  const points = useMemo(
    () =>
      days.flatMap((day, dayIndex) =>
        day.places.map((place, placeIndex) => ({
          id: place.id,
          position: [place.latitude, place.longitude],
          color: DAY_COLORS[dayIndex % DAY_COLORS.length],
          number: placeIndex + 1,
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
        className={styles.container}
      >
        <OsmTileLayer />
        <ZoomControl position="topleft" />
        <FlyToActivePlace points={points} activePlaceId={activePlaceId} />
        {points.map((point) => (
          <Marker
            key={point.id}
            position={point.position}
            icon={createDayMarkerIcon(point.number, point.color)}
            eventHandlers={{ click: () => onSelectPlace(point.id) }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
