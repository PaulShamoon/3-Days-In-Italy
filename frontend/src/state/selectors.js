import { mergeSelectionWithCatalog } from '../utils/mergePlaces'

/**
 * The working list of fully-detailed selected places, in selection order.
 *
 * Args:
 *   state (object): The trip state.
 *
 * Returns:
 *   Array<object>: Merged places — see mergeSelectionWithCatalog.
 */
export function selectWorkingPlaces(state) {
  return mergeSelectionWithCatalog(state.selection, state.placeCatalog)
}

/**
 * Whether Approve should be enabled, using target_count_min from the
 * original SelectionResponse as the single source of truth for the
 * minimum — never re-derived from busy-level constants on the frontend.
 *
 * Args:
 *   state (object): The trip state.
 *
 * Returns:
 *   object: { canApprove: boolean, currentCount: number, requiredMinimum: number }.
 */
export function selectApproveGate(state) {
  const requiredMinimum = state.selectMeta?.targetCountMin ?? Infinity
  const currentCount = state.selection.length
  return {
    canApprove: currentCount >= requiredMinimum,
    currentCount,
    requiredMinimum,
  }
}
