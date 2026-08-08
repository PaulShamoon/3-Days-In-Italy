import L from 'leaflet'

/**
 * Build a numbered teardrop marker icon matching the design's pin
 * treatment
 *
 * Args:
 *   number (number): The 1-based place number shown inside the pin.
 *   active (boolean): Whether this place's card/marker is currently selected.
 *
 * Returns:
 *   L.DivIcon: The Leaflet icon.
 */
export function createPlaceMarkerIcon(number, active) {
  const color = active ? 'var(--color-accent-700)' : 'var(--color-accent)'

  return L.divIcon({
    className: 'place-marker-icon',
    html: `
      <div style="
        width: 26px; height: 26px;
        border-radius: 50% 50% 50% 0;
        background: ${color};
        border: 1.5px solid #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.35);
        transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="transform: rotate(45deg); color: #fff; font-size: 10px; font-weight: 700;">${number}</span>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -30],
  })
}
