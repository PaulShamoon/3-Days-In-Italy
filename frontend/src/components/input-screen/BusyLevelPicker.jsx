import { BUSY_LEVEL_META, BUSY_LEVELS } from '../../constants'
import { BusyLevelCard } from './BusyLevelCard'
import styles from './BusyLevelPicker.module.css'

/**
 * Single-select grid of busy-level options (Chill/Busy/Packed).
 *
 * Args:
 *   busyLevel (string): The currently selected level.
 *   onChange (function): Called with the newly selected level.
 */
export function BusyLevelPicker({ busyLevel, onChange }) {
  return (
    <div className={styles.field}>
      <label id="busy-level-label" className={styles.label}>
        How busy do you want your days?
      </label>
      <div role="radiogroup" aria-labelledby="busy-level-label" className={styles.grid}>
        {BUSY_LEVELS.map((level) => (
          <BusyLevelCard
            key={level}
            level={level}
            meta={BUSY_LEVEL_META[level]}
            selected={busyLevel === level}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  )
}
