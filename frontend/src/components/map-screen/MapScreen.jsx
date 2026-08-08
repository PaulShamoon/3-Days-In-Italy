import { useMemo } from 'react'
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
  // Memoized so `places` only gets a new identity when the selection or
  // catalog actually changes, not on every unrelated re-render (e.g.
  // clicking a marker) — TripMap depends on this identity to know when
  // to re-fit the map's bounds. Deps are deliberately narrower than
  // `state` — selectWorkingPlaces only ever reads these two fields.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const places = useMemo(() => selectWorkingPlaces(state), [state.selection, state.placeCatalog])

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
