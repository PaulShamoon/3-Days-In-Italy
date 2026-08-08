import { useTripStateContext } from '../../state/TripStateContext'
import { selectWorkingPlaces } from '../../state/selectors'
import { MapScreenHeader } from './MapScreenHeader'
import { PlaceList } from './PlaceList'
import { TripMap } from './TripMap'
import { MakeChangesPanel } from './MakeChangesPanel'
import styles from './MapScreen.module.css'

/**
 * Map + review/edit screen: header actions, place list sidebar, live
 * map, and the make-changes panel
 */
export function MapScreen() {
  const { state } = useTripStateContext()
  const places = selectWorkingPlaces(state)

  return (
    <div className={styles.screen}>
      <MapScreenHeader places={places} />
      <div className={styles.layout}>
        <PlaceList places={places} />
        <TripMap places={places} />
      </div>
      {state.changesOpen && <MakeChangesPanel />}
    </div>
  )
}
