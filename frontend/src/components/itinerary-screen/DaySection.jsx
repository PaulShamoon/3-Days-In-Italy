import { googleMapsDayRouteUrl } from '../../utils/googleMaps'
import { MapPinIcon } from '../primitives/Icons'
import { DayTimelineItem } from './DayTimelineItem'
import styles from './DaySection.module.css'

/**
 * evening_only_warnings (backend/routes/itinerary/utils.py) always
 * builds place_ids as [earlier place, later place] within the day's
 * final order — so the later id is where the "tight" badge belongs.
 */
function findWarningMessage(warnings, placeId) {
  const warning = warnings.find((candidate) => candidate.place_ids.at(-1) === placeId)
  return warning ? warning.message : null
}

/**
 * One "Day N" section — heading + vertical timeline of that day's
 * places, in the order the backend already computed.
 *
 * Args:
 *   day (object): An ItineraryDay ({ day_number, places, warnings }).
 *   color (string): This day's color (a DAY_COLORS entry) — also used
 *     for this day's pins on ItineraryOverviewMap, so the numbered dots
 *     here double as the color legend rather than needing a separate one.
 *   activePlaceId (string | null): The currently clicked place's id, if any.
 *   onSelectPlace (function): Called with a place's id when it's clicked.
 */
export function DaySection({ day, color, activePlaceId, onSelectPlace }) {
  return (
    <div className={styles.section}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Day {day.day_number}</h2>
        <a
          className={styles.directions}
          href={googleMapsDayRouteUrl(day.places)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPinIcon width={12} height={12} />
          Directions
        </a>
      </div>
      <div className={styles.timeline}>
        <div className={styles.rail} />
        {day.places.map((place, index) => (
          <DayTimelineItem
            key={place.id}
            place={place}
            number={index + 1}
            color={color}
            isActive={activePlaceId === place.id}
            onSelect={() => onSelectPlace(place.id)}
            warningMessage={findWarningMessage(day.warnings, place.id)}
          />
        ))}
      </div>
    </div>
  )
}
