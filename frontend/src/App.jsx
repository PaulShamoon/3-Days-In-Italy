import { TripStateProvider, useTripStateContext } from './state/TripStateContext'
import { AppHeader } from './components/layout/AppHeader'
import { InputScreen } from './components/input-screen/InputScreen'
import { LoadingScreen } from './components/loading-screen/LoadingScreen'
import { MapScreen } from './components/map-screen/MapScreen'
import { ItineraryScreen } from './components/itinerary-screen/ItineraryScreen'
import styles from './App.module.css'

const SCREEN_BY_STAGE = {
  input: InputScreen,
  loading: LoadingScreen,
  map: MapScreen,
  itinerary: ItineraryScreen,
}

function Screens() {
  const { state } = useTripStateContext()
  const Screen = SCREEN_BY_STAGE[state.stage]
  return <Screen />
}

function App() {
  return (
    <TripStateProvider>
      <div className={styles.app}>
        <AppHeader />
        <Screens />
      </div>
    </TripStateProvider>
  )
}

export default App
