import styles from './WarningBadge.module.css'

/**
 * Soft, non-blocking warning banner shown under a timeline item
 *
 * Args:
 *   message (string): The ItineraryWarning's message text.
 */
export function WarningBadge({ message }) {
  return (
    <div className={styles.badge}>
      <span className={styles.icon} aria-hidden="true">
        &#9888;
      </span>
      <span className={styles.message}>{message}</span>
    </div>
  )
}
