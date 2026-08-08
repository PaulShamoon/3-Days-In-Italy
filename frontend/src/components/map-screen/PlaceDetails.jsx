import { Tag } from '../primitives/Tag'
import styles from './PlaceDetails.module.css'

const VARIANT_CLASS = {
  inline: styles.inline,
  popup: styles.popup,
}

/**
 * Place description + LLM reason, with an optional hours/seasonal/
 * booking tags row. Shared between the sidebar list-item's expanded
 * state ('inline' — appended below the card header, shows tags) and
 * the map marker popup ('popup' — standalone card, no tags row, per
 * the design doc).
 *
 * Args:
 *   place (object): A merged WorkingPlace.
 *   variant ('inline'|'popup'): Which context this is rendered in. Defaults to 'inline'.
 */
export function PlaceDetails({ place, variant = 'inline' }) {
  const showTags = variant === 'inline'

  return (
    <div className={`${styles.details} ${VARIANT_CLASS[variant]}`}>
      <p className={styles.description}>{place.description}</p>
      {showTags && (
        <div className={styles.tags}>
          {place.hours && <Tag variant="neutral">{place.hours}</Tag>}
          {place.seasonal_notes && <Tag variant="outline">&#9888; {place.seasonal_notes}</Tag>}
          {place.booking_required && <Tag variant="outline">Booking required</Tag>}
        </div>
      )}
      <p className={styles.reason}>&ldquo;{place.reason}&rdquo;</p>
    </div>
  )
}
