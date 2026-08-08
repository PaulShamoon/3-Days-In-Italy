import styles from './Spinner.module.css'

/**
 * A rotating ring spinner.
 *
 * Args:
 *   size (number): Diameter in pixels. Defaults to 16.
 *   variant ('accent'|'inverse'): 'accent' for standalone use (e.g. the loading screen); 'inverse' for a white spinner inside a solid-colored button.
 */
export function Spinner({ size = 16, variant = 'accent' }) {
  return (
    <span
      className={`${styles.spinner} ${variant === 'inverse' ? styles.inverse : styles.accent}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
