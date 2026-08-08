import { PlaceListItem } from './PlaceListItem'
import styles from './PlaceList.module.css'

/**
 * Scrollable sidebar of selected places, one PlaceListItem per place.
 *
 * Args:
 *   places (Array<object>): Merged WorkingPlace[], computed once by MapScreen.
 */
export function PlaceList({ places }) {
  return (
    <div className={styles.list}>
      {places.map((place) => (
        <PlaceListItem key={place.id} place={place} />
      ))}
    </div>
  )
}
