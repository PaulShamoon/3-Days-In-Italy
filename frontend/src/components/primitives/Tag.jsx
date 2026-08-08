import styles from './Tag.module.css'

const VARIANT_CLASS = {
  accent: styles.accent,
  neutral: styles.neutral,
  outline: styles.outline,
}

/**
 * Small pill label — accent (e.g. region), neutral (e.g. pace, hours),
 * or outline (e.g. seasonal-notes warning, booking-required).
 *
 * Args:
 *   variant ('accent'|'neutral'|'outline'): Visual style. Defaults to 'neutral'.
 *   children (ReactNode): Tag content.
 */
export function Tag({ variant = 'neutral', children }) {
  return <span className={`${styles.tag} ${VARIANT_CLASS[variant]}`}>{children}</span>
}
