import { useTripStateContext } from '../../state/TripStateContext'
import { BUSY_LEVEL_META } from '../../constants'
import { Button } from '../primitives/Button'
import { DownloadIcon } from '../primitives/Icons'
import styles from './ItineraryHeader.module.css'

/**
 * Kicker/H1/subline + Edit selection / Export PDF actions.
 *
 * Args:
 *   placeCount (number): Total places across all days, for the subline.
 */
export function ItineraryHeader({ placeCount }) {
  const { state, backToMap } = useTripStateContext()
  const busyMeta = BUSY_LEVEL_META[state.busyLevel]

  return (
    <div className={styles.header}>
      <div>
        <div className={styles.kicker}>Your Itinerary</div>
        <h1 className={styles.title}>Three Days in {state.region}</h1>
        <p className={styles.subline}>
          {placeCount} places &middot; {busyMeta.label} pace
        </p>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={backToMap}>
          Edit selection
        </Button>
        <Button variant="primary" onClick={() => window.print()}>
          Export PDF
          <DownloadIcon />
        </Button>
      </div>
    </div>
  )
}
