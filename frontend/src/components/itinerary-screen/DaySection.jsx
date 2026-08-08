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
 */
export function DaySection({ day }) {
  return (
    <div className={styles.section}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Day {day.day_number}</h2>
      </div>
      <div className={styles.timeline}>
        <div className={styles.rail} />
        {day.places.map((place) => (
          <DayTimelineItem
            key={place.id}
            place={place}
            warningMessage={findWarningMessage(day.warnings, place.id)}
          />
        ))}
      </div>
    </div>
  )
}
