import { useEffect, useRef } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { useTripStateContext } from '../../state/TripStateContext'
import { createPlaceMarkerIcon } from './placeMarkerIcon'
import { PlaceDetails } from '../primitives/PlaceDetails'
import { formatType } from '../../utils/formatPlace'
import { CloseIcon } from '../primitives/Icons'
import styles from './PlaceMarker.module.css'

/**
 * One place's map marker + popup. Clicking the marker toggles the same
 * activePlaceId the sidebar list uses, so a pin and its matching list
 * card open/close in sync — state (not Leaflet's own click-to-open) is
 * the single source of truth for popup visibility. autoClose/
 * closeOnClick are disabled so Leaflet never closes the popup on its
 * own, which would otherwise let it drift out of sync with state.
 *
 * Args:
 *   place (object): A merged WorkingPlace.
 */
export function PlaceMarker({ place }) {
  const { state, selectPlace } = useTripStateContext()
  const isActive = state.activePlaceId === place.id
  const markerRef = useRef(null)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return
    if (isActive) marker.openPopup()
    else marker.closePopup()
  }, [isActive])

  return (
    <Marker
      ref={markerRef}
      position={[place.latitude, place.longitude]}
      icon={createPlaceMarkerIcon(place.number, isActive)}
      eventHandlers={{ click: () => selectPlace(place.id) }}
      zIndexOffset={isActive ? 1000 : 0}
    >
      <Popup closeButton={false} autoClose={false} closeOnClick={false} autoPan={false}>
        <div className={styles.popup}>
          <button
            type="button"
            aria-label="Close"
            className={styles.close}
            onClick={() => selectPlace(place.id)}
          >
            <CloseIcon width={12} height={12} />
          </button>
          <div className={styles.name}>{place.name}</div>
          <div className={styles.meta}>
            {formatType(place.type)} &middot; {place.price_range} &middot; &#9733; {place.rating}
          </div>
          <PlaceDetails place={place} variant="popup" />
        </div>
      </Popup>
    </Marker>
  )
}
