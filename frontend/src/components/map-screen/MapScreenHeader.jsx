import { useTripStateContext } from '../../state/TripStateContext'
import { selectApproveGate } from '../../state/selectors'
import { BUSY_LEVEL_META } from '../../constants'
import { Tag } from '../primitives/Tag'
import { Button } from '../primitives/Button'
import { CheckIcon } from '../primitives/Icons'
import styles from './MapScreenHeader.module.css'

/**
 * Region/pace tags, match count, and the Make changes / Approve actions.
 *
 * Args:
 *   places (Array<object>): Merged WorkingPlace[], computed once by MapScreen — only its length is used here.
 */
export function MapScreenHeader({ places }) {
  const { state, openChanges, approveItinerary } = useTripStateContext()
  const { canApprove, currentCount, requiredMinimum } = selectApproveGate(state)
  const busyMeta = BUSY_LEVEL_META[state.busyLevel]
  const placesNeeded = requiredMinimum - currentCount

  return (
    <div className={styles.header}>
      <div className={styles.tags}>
        <Tag variant="accent">{state.region}</Tag>
        <Tag variant="neutral">
          {busyMeta.label} &middot; {busyMeta.perDay} places/day
        </Tag>
        <span className={styles.count}>{places.length} places matched</span>
      </div>
      <div className={styles.actionsColumn}>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={openChanges}>
            Make changes
          </Button>
          <Button
            variant="primary"
            disabled={!canApprove}
            loading={state.itineraryStatus === 'pending'}
            onClick={approveItinerary}
          >
            Approve
            <CheckIcon />
          </Button>
        </div>
        {!canApprove && (
          <span className={styles.approveHint}>
            Add {placesNeeded} more place{placesNeeded === 1 ? '' : 's'} to approve
          </span>
        )}
        {state.itineraryStatus === 'error' && (
          <span className={styles.approveHint}>
            {state.itineraryError ?? 'Something went wrong — please try again.'}
          </span>
        )}
      </div>
    </div>
  )
}
