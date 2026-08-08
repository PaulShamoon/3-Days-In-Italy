import { formatType, formatDuration } from '../../utils/formatPlace'
import { PlaceDetails } from '../primitives/PlaceDetails'
import { WarningBadge } from './WarningBadge'
import styles from './DayTimelineItem.module.css'

/**
 * One place in a day's vertical timeline — a numbered dot on the rail,
 * colored to match this day's pins on ItineraryOverviewMap (so the dots
 * double as a color legend, no separate one needed), duration (if
 * known), name, type/price/rating meta, full place details (description,
 * hours, seasonal notes, booking requirement — always visible, not
 * click-to-expand, since this is what ends up in the printed PDF people
 * actually use during the trip), and an optional soft warning badge
 * beneath it. Directions are per-day, not per-place — see DaySection's
 * heading. Clicking anywhere on the item selects it, flying
 * ItineraryOverviewMap to its pin (see ItineraryScreen).
 *
 * Args:
 *   place (object): A Place from ItineraryDay.places.
 *   number (number): This place's 1-based position within its day.
 *   color (string): This day's color (a DAY_COLORS entry).
 *   isActive (boolean): Whether this place is the currently selected one.
 *   onSelect (function): Called when this item is clicked.
 *   warningMessage (string | null): A soft warning to show under this item, if any.
 */
export function DayTimelineItem({ place, number, color, isActive, onSelect, warningMessage }) {
  const duration = formatDuration(place.duration_minutes)

  return (
    <div className={styles.item} onClick={onSelect}>
      <div className={`${styles.dot} tabular-nums`} style={{ background: color }}>
        {number}
      </div>
      <div className={`${styles.content} ${isActive ? styles.active : ''}`}>
        {duration && <div className={`${styles.duration} tabular-nums`}>{duration}</div>}
        <div className={styles.name}>{place.name}</div>
        <div className={styles.meta}>
          {formatType(place.type)} &middot; {place.price_range} &middot; &#9733; {place.rating}
        </div>
        <PlaceDetails place={place} variant="inline" />
      </div>
      {warningMessage && <WarningBadge message={warningMessage} />}
    </div>
  )
}
