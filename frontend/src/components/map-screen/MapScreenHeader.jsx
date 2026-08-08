import { useTripStateContext } from '../../state/TripStateContext'
import { selectWorkingPlaces, selectApproveGate } from '../../state/selectors'
import { BUSY_LEVEL_META } from '../../constants'
import { Tag } from '../primitives/Tag'
import { Button } from '../primitives/Button'
import { CheckIcon } from '../primitives/Icons'
import styles from './MapScreenHeader.module.css'

/** Region/pace tags, match count, and the Make changes / Approve actions. */
export function MapScreenHeader() {
  const { state, openChanges, approveItinerary } = useTripStateContext()
  const places = selectWorkingPlaces(state)
  const { canApprove } = selectApproveGate(state)
  const busyMeta = BUSY_LEVEL_META[state.busyLevel]

  return (
    <div className={styles.header}>
      <div className={styles.tags}>
        <Tag variant="accent">{state.region}</Tag>
        <Tag variant="neutral">
          {busyMeta.label} &middot; {busyMeta.perDay} places/day
        </Tag>
        <span className={styles.count}>{places.length} places matched</span>
      </div>
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
    </div>
  )
}
