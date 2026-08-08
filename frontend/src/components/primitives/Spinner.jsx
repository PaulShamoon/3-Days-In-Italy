import styles from './Spinner.module.css'

/**
 * A rotating ring spinner, styled for use inside a solid-colored button.
 *
 * Args:
 *   size (number): Diameter in pixels. Defaults to 16.
 */
export function Spinner({ size = 16 }) {
  return <span className={styles.spinner} style={{ width: size, height: size }} aria-hidden="true" />
}
