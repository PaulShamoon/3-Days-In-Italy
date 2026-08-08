/**
 * Format a place's raw `type` field into a human-readable label
 *
 * Args:
 *   type (string): The place's raw `type` field.
 *
 * Returns:
 *   string: A capitalized, space-separated label.
 */
export function formatType(type) {
  const spaced = type.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * Format a place's raw `duration_minutes` field into a human-readable label
 *
 * Args:
 *   minutes (number | null): The place's duration_minutes field.
 *
 * Returns:
 *   string | null: A human-readable duration, or null if unknown.
 */
export function formatDuration(minutes) {
  if (minutes == null) return null
  if (minutes < 60) return `${minutes} min`

  const hours = minutes / 60
  const roundedHours = Math.round(hours * 10) / 10
  return `${roundedHours} hr${roundedHours === 1 ? '' : 's'}`
}
