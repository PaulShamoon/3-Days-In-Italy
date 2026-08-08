import { formatType, formatDuration } from '../../utils/formatPlace'
import { WarningBadge } from './WarningBadge'
import styles from './DayTimelineItem.module.css'

/**
 * One place in a day's vertical timeline — a dot on the rail, duration
 * (if known), name, and type/price/rating meta; an optional soft
 * warning badge beneath it.
 *
 * Args:
 *   place (object): A Place from ItineraryDay.places.
 *   warningMessage (string | null): A soft warning to show under this item, if any.
 */
export function DayTimelineItem({ place, warningMessage }) {
  const duration = formatDuration(place.duration_minutes)

  return (
    <div className={styles.item}>
      <div className={styles.dot} />
      <div>
        {duration && <div className={`${styles.duration} tabular-nums`}>{duration}</div>}
        <div className={styles.name}>{place.name}</div>
        <div className={styles.meta}>
          {formatType(place.type)} &middot; {place.price_range} &middot; &#9733; {place.rating}
        </div>
      </div>
      {warningMessage && <WarningBadge message={warningMessage} />}
    </div>
  )
}
