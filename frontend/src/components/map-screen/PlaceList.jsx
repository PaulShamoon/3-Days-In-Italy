import { useTripStateContext } from '../../state/TripStateContext'
import { selectWorkingPlaces } from '../../state/selectors'
import { PlaceListItem } from './PlaceListItem'
import styles from './PlaceList.module.css'

/** Scrollable sidebar of selected places, one PlaceListItem per place. */
export function PlaceList() {
  const { state } = useTripStateContext()
  const places = selectWorkingPlaces(state)

  return (
    <div className={styles.list}>
      {places.map((place) => (
        <PlaceListItem key={place.id} place={place} />
      ))}
    </div>
  )
}
