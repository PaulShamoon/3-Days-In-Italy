import styles from './ProgressBar.module.css'

/** A thin rounded, looping indeterminate progress bar. */
export function ProgressBar() {
  return (
    <div className={styles.track}>
      <div className={styles.indeterminateFill} />
    </div>
  )
}
