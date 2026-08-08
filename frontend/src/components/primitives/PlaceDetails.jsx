import { Tag } from './Tag'
import styles from './PlaceDetails.module.css'

const VARIANT_CLASS = {
  inline: styles.inline,
  popup: styles.popup,
}

/**
 * Place description + optional hours/seasonal/booking tags row + LLM
 * reason (if present — itinerary places don't carry one, since that
 * reasoning was specific to the selection/refine step). Shared across
 * the map screen's sidebar list-item expanded state ('inline' —
 * appended below the card header, shows tags), the map marker popup
 * ('popup' — standalone card, no tags row, per the design doc), and the
 * itinerary screen's timeline ('inline' — the same at-a-glance trip
 * details a printed PDF needs to be useful during the actual trip).
 *
 * Args:
 *   place (object): A merged WorkingPlace or plain Place.
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
      {place.reason && <p className={styles.reason}>&ldquo;{place.reason}&rdquo;</p>}
    </div>
  )
}
