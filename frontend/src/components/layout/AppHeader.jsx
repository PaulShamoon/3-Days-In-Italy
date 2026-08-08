import { useTripStateContext } from '../../state/TripStateContext'
import { Button } from '../primitives/Button'
import styles from './AppHeader.module.css'

/**
 * Logo + "Trip Planner" kicker, shown above every screen. Once a plan
 * exists (past the input screen), also shows a way to start over
 */
export function AppHeader() {
  const { state, restartTrip } = useTripStateContext()

  const handleRestart = () => {
    if (window.confirm('Start a new trip? This will clear your current plan.')) {
      restartTrip()
    }
  }

  return (
    <div className={styles.header}>
      <div className={styles.logo}>Tre Giorni</div>
      <div className={styles.right}>
        {state.stage !== 'input' && (
          <Button variant="ghost" onClick={handleRestart}>
            Start over
          </Button>
        )}
        <div className={styles.kicker}>Trip Planner</div>
      </div>
    </div>
  )
}
