import { useTripStateContext } from '../../state/TripStateContext'
import { ItineraryHeader } from './ItineraryHeader'
import { ItineraryOverviewMap } from './ItineraryOverviewMap'
import { DaySection } from './DaySection'
import styles from './ItineraryScreen.module.css'

/**
 * Final day-by-day itinerary
 */
export function ItineraryScreen() {
  const { state } = useTripStateContext()
  const days = state.itinerary ?? []
  const placeCount = days.reduce((total, day) => total + day.places.length, 0)

  return (
    <div className={styles.screen}>
      <ItineraryHeader placeCount={placeCount} />
      <ItineraryOverviewMap days={days} />
      {days.map((day) => (
        <DaySection key={day.day_number} day={day} />
      ))}
    </div>
  )
}
