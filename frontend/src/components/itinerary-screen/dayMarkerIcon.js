import L from 'leaflet'

/**
 * Build a small numbered circle marker icon for the itinerary overview
 * map — colored by day (see DAY_COLORS) and numbered by the place's
 * 1-based position within that day, so a pin can be cross-referenced
 * against the matching numbered dot in that day's timeline list.
 *
 * Args:
 *   number (number): The 1-based position of this place within its day.
 *   color (string): The day's color (a DAY_COLORS entry).
 *
 * Returns:
 *   L.DivIcon: The Leaflet icon.
 */
export function createDayMarkerIcon(number, color) {
  return L.divIcon({
    className: 'day-marker-icon',
    html: `
      <div style="
        width: 20px; height: 20px;
        border-radius: 50%;
        background: ${color};
        border: 1.5px solid #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="color: #fff; font-size: 10px; font-weight: 700;">${number}</span>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}
