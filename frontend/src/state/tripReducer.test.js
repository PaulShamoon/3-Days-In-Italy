import { describe, it, expect } from 'vitest'
import { tripReducer, initialState } from './tripReducer'
import * as actions from './tripActions'

describe('tripReducer', () => {
  it('returns the same state for an unknown action', () => {
    expect(tripReducer(initialState, { type: 'NOT_A_REAL_ACTION' })).toBe(initialState)
  })

  it('updates promptText and busyLevel', () => {
    let state = tripReducer(initialState, actions.promptChanged('hello'))
    expect(state.promptText).toBe('hello')
    state = tripReducer(state, actions.busyLevelChanged('chill'))
    expect(state.busyLevel).toBe('chill')
  })

  describe('select flow', () => {
    it('moves to loading and clears any prior error on SELECT_PENDING', () => {
      const state = tripReducer({ ...initialState, selectError: 'old error' }, actions.selectPending())
      expect(state.stage).toBe('loading')
      expect(state.selectStatus).toBe('pending')
      expect(state.selectError).toBeNull()
    })

    it('stays on the input stage and does not set region/selection when matches are insufficient', () => {
      const response = {
        region: 'Tuscany',
        selected: [{ id: 'place_001', reason: 'fits' }],
        matched_count: 2,
        target_count_min: 6,
        target_count_max: 9,
        insufficient_matches: true,
      }
      const state = tripReducer({ ...initialState, stage: 'loading' }, actions.selectSucceeded(response))

      expect(state.stage).toBe('input')
      expect(state.selectStatus).toBe('idle')
      expect(state.selectMeta).toEqual({
        matchedCount: 2,
        targetCountMin: 6,
        targetCountMax: 9,
        insufficientMatches: true,
      })
      expect(state.region).toBeNull()
      expect(state.selection).toEqual([])
    })

    it('sets region/selection and stays on the loading stage (waiting on GET /places) when matches are sufficient', () => {
      const response = {
        region: 'Tuscany',
        selected: [{ id: 'place_001', reason: 'fits' }],
        matched_count: 8,
        target_count_min: 6,
        target_count_max: 9,
        insufficient_matches: false,
      }
      const state = tripReducer({ ...initialState, stage: 'loading' }, actions.selectSucceeded(response))

      expect(state.stage).toBe('loading')
      expect(state.region).toBe('Tuscany')
      expect(state.selection).toEqual(response.selected)
      expect(state.selectMeta.insufficientMatches).toBe(false)
    })

    it('routes back to input with an error on SELECT_FAILED', () => {
      const state = tripReducer({ ...initialState, stage: 'loading' }, actions.selectFailed('network down'))
      expect(state.stage).toBe('input')
      expect(state.selectStatus).toBe('error')
      expect(state.selectError).toBe('network down')
    })
  })

  describe('places flow', () => {
    it('moves to the map stage on PLACES_SUCCEEDED', () => {
      const catalog = { place_001: { id: 'place_001', name: 'Uffizi' } }
      const state = tripReducer({ ...initialState, stage: 'loading' }, actions.placesSucceeded(catalog))
      expect(state.stage).toBe('map')
      expect(state.placesStatus).toBe('idle')
      expect(state.placeCatalog).toBe(catalog)
    })

    it('routes back to input and mirrors the error into selectError on PLACES_FAILED, instead of leaving the user stuck on the loading stage', () => {
      const state = tripReducer(
        { ...initialState, stage: 'loading', region: 'Tuscany', selection: [{ id: 'place_001', reason: 'fits' }] },
        actions.placesFailed('network down')
      )

      expect(state.stage).toBe('input')
      expect(state.placesStatus).toBe('error')
      expect(state.placesError).toBe('network down')
      // Mirrored into selectStatus/selectError so InputScreen's existing
      // error banner renders it without needing its own UI.
      expect(state.selectStatus).toBe('error')
      expect(state.selectError).toBe('network down')
    })
  })

  describe('place selection and removal', () => {
    it('toggles activePlaceId on repeated PLACE_SELECTED with the same id', () => {
      let state = tripReducer(initialState, actions.placeSelected('place_001'))
      expect(state.activePlaceId).toBe('place_001')
      state = tripReducer(state, actions.placeSelected('place_001'))
      expect(state.activePlaceId).toBeNull()
    })

    it('switches activePlaceId when a different place is selected', () => {
      let state = tripReducer(initialState, actions.placeSelected('place_001'))
      state = tripReducer(state, actions.placeSelected('place_002'))
      expect(state.activePlaceId).toBe('place_002')
    })

    it('tracks and clears pendingRemoveId via REMOVE_REQUESTED/REMOVE_CANCELLED', () => {
      let state = tripReducer(initialState, actions.removeRequested('place_001'))
      expect(state.pendingRemoveId).toBe('place_001')
      state = tripReducer(state, actions.removeCancelled())
      expect(state.pendingRemoveId).toBeNull()
    })

    it('filters the removed place out of selection on REMOVE_CONFIRMED', () => {
      const withSelection = {
        ...initialState,
        selection: [
          { id: 'place_001', reason: 'a' },
          { id: 'place_002', reason: 'b' },
        ],
        pendingRemoveId: 'place_001',
      }
      const state = tripReducer(withSelection, actions.removeConfirmed('place_001'))
      expect(state.selection).toEqual([{ id: 'place_002', reason: 'b' }])
      expect(state.pendingRemoveId).toBeNull()
    })

    it('clears activePlaceId if the removed place was the active one', () => {
      const withActive = {
        ...initialState,
        selection: [{ id: 'place_001', reason: 'a' }],
        activePlaceId: 'place_001',
      }
      const state = tripReducer(withActive, actions.removeConfirmed('place_001'))
      expect(state.activePlaceId).toBeNull()
    })

    it('leaves activePlaceId alone if a different place was removed', () => {
      const withActive = {
        ...initialState,
        selection: [
          { id: 'place_001', reason: 'a' },
          { id: 'place_002', reason: 'b' },
        ],
        activePlaceId: 'place_002',
      }
      const state = tripReducer(withActive, actions.removeConfirmed('place_001'))
      expect(state.activePlaceId).toBe('place_002')
    })
  })

  describe('make-changes panel', () => {
    it('resets changesText/changesError/outOfRegionMessage on CHANGES_OPENED', () => {
      const dirty = { ...initialState, changesText: 'stale', changesError: 'old', outOfRegionMessage: 'old msg' }
      const state = tripReducer(dirty, actions.changesOpened())
      expect(state.changesOpen).toBe(true)
      expect(state.changesText).toBe('')
      expect(state.changesError).toBeNull()
      expect(state.outOfRegionMessage).toBeNull()
    })

    it('resets the same fields and closes on CHANGES_CLOSED', () => {
      const dirty = { ...initialState, changesOpen: true, changesText: 'stale', changesError: 'old' }
      const state = tripReducer(dirty, actions.changesClosed())
      expect(state.changesOpen).toBe(false)
      expect(state.changesText).toBe('')
      expect(state.changesError).toBeNull()
    })
  })

  describe('refine flow', () => {
    it('replaces the selection and closes the panel on REFINE_SUCCEEDED', () => {
      const open = { ...initialState, changesOpen: true, changesText: 'add wine bars', changesSubmitting: true }
      const newSelection = [{ id: 'place_005', reason: 'new' }]
      const state = tripReducer(open, actions.refineSucceeded(newSelection))
      expect(state.selection).toBe(newSelection)
      expect(state.changesSubmitting).toBe(false)
      expect(state.changesOpen).toBe(false)
      expect(state.changesText).toBe('')
    })

    it('sets outOfRegionMessage and leaves selection untouched on REFINE_OUT_OF_REGION', () => {
      const existingSelection = [{ id: 'place_001', reason: 'fits' }]
      const state = tripReducer(
        { ...initialState, selection: existingSelection, changesSubmitting: true },
        actions.refineOutOfRegion("That's outside your selected region.")
      )
      expect(state.changesSubmitting).toBe(false)
      expect(state.outOfRegionMessage).toBe("That's outside your selected region.")
      expect(state.selection).toBe(existingSelection)
    })

    it('sets changesError and stops submitting on REFINE_FAILED', () => {
      const state = tripReducer({ ...initialState, changesSubmitting: true }, actions.refineFailed('network down'))
      expect(state.changesSubmitting).toBe(false)
      expect(state.changesError).toBe('network down')
    })
  })

  describe('itinerary flow', () => {
    it('moves to the itinerary stage and closes a left-open make-changes panel on ITINERARY_SUCCEEDED', () => {
      const withOpenPanel = {
        ...initialState,
        changesOpen: true,
        changesText: 'stale',
        changesError: 'old',
        outOfRegionMessage: 'old msg',
      }
      const days = [{ day_number: 1, places: [], warnings: [] }]
      const state = tripReducer(withOpenPanel, actions.itinerarySucceeded(days))

      expect(state.stage).toBe('itinerary')
      expect(state.itinerary).toBe(days)
      // Regression: the panel used to silently reopen on a later "Edit
      // selection" if it was left open when Approve was clicked.
      expect(state.changesOpen).toBe(false)
      expect(state.changesText).toBe('')
      expect(state.changesError).toBeNull()
      expect(state.outOfRegionMessage).toBeNull()
    })

    it('sets itineraryError and stops loading on ITINERARY_FAILED, without changing stage', () => {
      const state = tripReducer({ ...initialState, stage: 'map', itineraryStatus: 'pending' }, actions.itineraryFailed('network down'))
      expect(state.stage).toBe('map')
      expect(state.itineraryStatus).toBe('error')
      expect(state.itineraryError).toBe('network down')
    })
  })

  it('returns to the map stage on BACK_TO_MAP', () => {
    const state = tripReducer({ ...initialState, stage: 'itinerary' }, actions.backToMap())
    expect(state.stage).toBe('map')
  })

  it('resets everything to initialState on TRIP_RESTARTED', () => {
    const dirty = {
      ...initialState,
      stage: 'map',
      region: 'Tuscany',
      selection: [{ id: 'place_001', reason: 'fits' }],
      changesOpen: true,
    }
    expect(tripReducer(dirty, actions.tripRestarted())).toEqual(initialState)
  })
})
