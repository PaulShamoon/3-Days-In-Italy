import styles from './BusyLevelCard.module.css'

/**
 * One selectable option in the busy-level picker.
 *
 * Args:
 *   level (string): 'chill' | 'busy' | 'packed'.
 *   meta (object): { label, perDay, total } display copy.
 *   selected (boolean): Whether this level is currently chosen.
 *   onSelect (function): Called with `level` when clicked.
 */
export function BusyLevelCard({ level, meta, selected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={() => onSelect(level)}
    >
      <span className={styles.label}>{meta.label}</span>
      <span className={styles.perDay}>{meta.perDay} places/day</span>
      <span className={styles.total}>{meta.total} total</span>
    </button>
  )
}
