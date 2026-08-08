import { TileLayer } from 'react-leaflet'

/** Shared OpenStreetMap tile layer — used by every Leaflet map in the app. */
export function OsmTileLayer() {
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    />
  )
}
