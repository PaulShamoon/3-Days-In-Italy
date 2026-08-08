import { useTripStateContext } from '../../state/TripStateContext'
import { formatType } from '../../utils/formatPlace'
import { CloseIcon } from '../primitives/Icons'
import { PlaceDetails } from './PlaceDetails'
import { RemoveConfirm } from './RemoveConfirm'
import styles from './PlaceListItem.module.css'

/**
 * One place card in the sidebar list — number badge, name, meta line,
 * remove (X) button. Clicking the card body (not the X) toggles an
 * inline expand showing PlaceDetails; clicking X shows RemoveConfirm
 * instead.
 *
 * Args:
 *   place (object): A merged WorkingPlace (full Place + reason + number).
 */
export function PlaceListItem({ place }) {
  const { state, selectPlace, requestRemove } = useTripStateContext()
  const isActive = state.activePlaceId === place.id
  const isPendingRemove = state.pendingRemoveId === place.id

  return (
    <div
      className={`${styles.card} ${isPendingRemove ? styles.pendingRemove : isActive ? styles.active : ''}`}
      onClick={() => selectPlace(place.id)}
    >
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <span className={`${styles.number} tabular-nums`}>{place.number}</span>
            <span className={styles.name}>{place.name}</span>
          </div>
          <div className={styles.meta}>
            {formatType(place.type)} &middot; {place.price_range} &middot; &#9733; {place.rating}
          </div>
        </div>
        <button
          type="button"
          aria-label="Remove"
          className={styles.removeButton}
          onClick={(event) => {
            event.stopPropagation()
            requestRemove(place.id)
          }}
        >
          <CloseIcon width={15} height={15} />
        </button>
      </div>

      {isPendingRemove && <RemoveConfirm placeId={place.id} />}
      {!isPendingRemove && isActive && <PlaceDetails place={place} variant="inline" />}
    </div>
  )
}
