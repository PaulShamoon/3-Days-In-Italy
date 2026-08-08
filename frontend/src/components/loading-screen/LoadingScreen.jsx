import { ProgressBar } from '../primitives/ProgressBar'
import { useLoadingCycle } from './useLoadingCycle'
import styles from './LoadingScreen.module.css'

/** Shown while POST /select (and the follow-up GET /places) are in flight. */
export function LoadingScreen() {
  const { message } = useLoadingCycle()

  return (
    <div className={styles.screen}>
      <div className={styles.message}>{message}</div>
      <p className={styles.caption}>Matching your prompt against places across Italy.</p>
      <ProgressBar />
    </div>
  )
}
