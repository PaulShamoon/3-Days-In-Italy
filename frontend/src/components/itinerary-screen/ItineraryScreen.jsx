import { useState } from 'react'
import { useTripStateContext } from '../../state/TripStateContext'
import { DAY_COLORS } from '../../utils/dayColors'
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
  const [activePlaceId, setActivePlaceId] = useState(null)

  const selectPlace = (id) => setActivePlaceId((current) => (current === id ? null : id))

  return (
    <div className={styles.screen}>
      <ItineraryHeader placeCount={placeCount} />
      <ItineraryOverviewMap days={days} activePlaceId={activePlaceId} onSelectPlace={selectPlace} />
      {days.map((day, index) => (
        <DaySection
          key={day.day_number}
          day={day}
          color={DAY_COLORS[index % DAY_COLORS.length]}
          activePlaceId={activePlaceId}
          onSelectPlace={selectPlace}
        />
      ))}
    </div>
  )
}
