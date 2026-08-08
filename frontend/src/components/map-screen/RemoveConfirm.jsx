import { useTripStateContext } from '../../state/TripStateContext'
import { Button } from '../primitives/Button'
import styles from './RemoveConfirm.module.css'

const COMPACT_STYLE = { padding: '4px 10px', fontSize: '12px' }

/**
 * "Remove this place?" confirm footer shown after clicking a card's X
 * — client-side only, no API call (per user_flow.md).
 *
 * Args:
 *   placeId (string): The id of the place pending removal.
 */
export function RemoveConfirm({ placeId }) {
  const { cancelRemove, confirmRemove } = useTripStateContext()

  return (
    <div className={styles.confirm} onClick={(event) => event.stopPropagation()}>
      <span className={styles.prompt}>Remove this place?</span>
      <div className={styles.actions}>
        <Button variant="ghost" style={COMPACT_STYLE} onClick={cancelRemove}>
          Cancel
        </Button>
        <Button variant="secondary" style={COMPACT_STYLE} onClick={() => confirmRemove(placeId)}>
          Remove
        </Button>
      </div>
    </div>
  )
}
