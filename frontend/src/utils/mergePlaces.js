/**
 * Join the ordered selection ({id, reason} pairs from /select or
 * /refine) against the region's full place catalog (from GET /places)
 * into one working list. This is the only place that join happens —
 * every screen that needs full place details reads through here
 * instead of re-joining inline.
 *
 * Args:
 *   selection (Array<{id: string, reason: string}>): The ordered selection.
 *   placeCatalog (Object<string, object>): Full place details keyed by id.
 *
 * Returns:
 *   Array<object>: Each selected place's full details plus `reason` and a 1-based `number`. Ids missing from the catalog are dropped rather than crashing the UI.
 */
export function mergeSelectionWithCatalog(selection, placeCatalog) {
  const merged = []

  selection.forEach((entry, index) => {
    const place = placeCatalog[entry.id]
    if (place) {
      merged.push({ ...place, reason: entry.reason, number: index + 1 })
    }
  })

  return merged
}
