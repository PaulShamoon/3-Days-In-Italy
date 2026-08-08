import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTripState } from './useTripState'
import { postSelect, postRefine } from '../api/selectionApi'
import { postItinerary } from '../api/itineraryApi'
import { getPlaces } from '../api/placesApi'

vi.mock('../api/selectionApi', () => ({
  postSelect: vi.fn(),
  postRefine: vi.fn(),
}))
vi.mock('../api/itineraryApi', () => ({
  postItinerary: vi.fn(),
}))
vi.mock('../api/placesApi', () => ({
  getPlaces: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

/** A promise whose resolution is controlled from outside, for tests that need to control ordering of async work. */
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const SUFFICIENT_SELECT_RESPONSE = {
  region: 'Tuscany',
  selected: [{ id: 'place_001', reason: 'fits' }],
  matched_count: 8,
  target_count_min: 6,
  target_count_max: 9,
  insufficient_matches: false,
}

describe('useTripState', () => {
  describe('submitPrompt', () => {
    it('advances through select -> places -> map on success', async () => {
      postSelect.mockResolvedValue(SUFFICIENT_SELECT_RESPONSE)
      getPlaces.mockResolvedValue({ places: [{ id: 'place_001', name: 'Uffizi' }] })

      const { result } = renderHook(() => useTripState())
      act(() => {
        result.current.setPromptText('wine, quiet historic towns, and great food')
      })

      await act(async () => {
        await result.current.submitPrompt()
      })

      expect(postSelect).toHaveBeenCalledWith({
        promptText: 'wine, quiet historic towns, and great food',
        busyLevel: 'busy',
      })
      expect(getPlaces).toHaveBeenCalledWith('Tuscany')
      expect(result.current.state.stage).toBe('map')
      expect(result.current.state.region).toBe('Tuscany')
      expect(result.current.state.placeCatalog).toEqual({ place_001: { id: 'place_001', name: 'Uffizi' } })
    })

    it('stays on the input stage and never calls getPlaces when matches are insufficient', async () => {
      postSelect.mockResolvedValue({ ...SUFFICIENT_SELECT_RESPONSE, insufficient_matches: true, matched_count: 2 })

      const { result } = renderHook(() => useTripState())
      await act(async () => {
        await result.current.submitPrompt()
      })

      expect(result.current.state.stage).toBe('input')
      expect(result.current.state.selectMeta.insufficientMatches).toBe(true)
      expect(getPlaces).not.toHaveBeenCalled()
    })

    it('shows an error and stays on input when /select fails', async () => {
      postSelect.mockRejectedValue(new Error('network down'))

      const { result } = renderHook(() => useTripState())
      await act(async () => {
        await result.current.submitPrompt()
      })

      expect(result.current.state.stage).toBe('input')
      expect(result.current.state.selectStatus).toBe('error')
      expect(result.current.state.selectError).toBe('network down')
    })

    it('shows an error and returns to input when /places fails after a successful /select', async () => {
      postSelect.mockResolvedValue(SUFFICIENT_SELECT_RESPONSE)
      getPlaces.mockRejectedValue(new Error('network down'))

      const { result } = renderHook(() => useTripState())
      await act(async () => {
        await result.current.submitPrompt()
      })

      expect(result.current.state.stage).toBe('input')
      expect(result.current.state.selectError).toBe('network down')
    })
  })

  describe('restartTrip epoch guard (regression)', () => {
    it('ignores a select response that resolves after a restart, instead of hijacking the fresh state', async () => {
      const select = deferred()
      postSelect.mockReturnValue(select.promise)

      const { result } = renderHook(() => useTripState())

      let submitPromise
      act(() => {
        submitPromise = result.current.submitPrompt()
      })
      expect(result.current.state.stage).toBe('loading')

      // Restart while the select call is still in flight.
      act(() => {
        result.current.restartTrip()
      })
      expect(result.current.state.stage).toBe('input')

      // Now let the stale select call resolve.
      await act(async () => {
        select.resolve(SUFFICIENT_SELECT_RESPONSE)
        await submitPromise
      })

      // Must still look like a freshly-restarted trip, not hijacked into
      // the old trip the user already abandoned.
      expect(result.current.state.stage).toBe('input')
      expect(result.current.state.region).toBeNull()
      expect(getPlaces).not.toHaveBeenCalled()
    })

    it('ignores a places response that resolves after a restart', async () => {
      postSelect.mockResolvedValue(SUFFICIENT_SELECT_RESPONSE)
      const places = deferred()
      getPlaces.mockReturnValue(places.promise)

      const { result } = renderHook(() => useTripState())

      let submitPromise
      act(() => {
        submitPromise = result.current.submitPrompt()
      })

      // Wait for the chain to reach the /places call (invoked, still
      // pending) before restarting -- avoids assuming a specific number
      // of microtask hops for /select's mock to resolve.
      await waitFor(() => {
        expect(getPlaces).toHaveBeenCalled()
      })

      act(() => {
        result.current.restartTrip()
      })
      expect(result.current.state.stage).toBe('input')

      await act(async () => {
        places.resolve({ places: [{ id: 'place_001', name: 'Uffizi' }] })
        await submitPromise
      })

      expect(result.current.state.stage).toBe('input')
      expect(result.current.state.placeCatalog).toEqual({})
    })
  })

  describe('submitRefinement', () => {
    it('replaces the selection on success', async () => {
      postRefine.mockResolvedValue({ out_of_region_request: false, selected: [{ id: 'place_002', reason: 'new' }] })

      const { result } = renderHook(() => useTripState())
      await act(async () => {
        await result.current.submitRefinement()
      })

      expect(result.current.state.selection).toEqual([{ id: 'place_002', reason: 'new' }])
      expect(result.current.state.changesSubmitting).toBe(false)
    })

    it('sets outOfRegionMessage and leaves selection untouched when out_of_region_request is true', async () => {
      postRefine.mockResolvedValue({
        out_of_region_request: true,
        out_of_region_message: "That's outside your selected region.",
        selected: [],
      })

      const { result } = renderHook(() => useTripState())
      await act(async () => {
        await result.current.submitRefinement()
      })

      expect(result.current.state.outOfRegionMessage).toBe("That's outside your selected region.")
      expect(result.current.state.selection).toEqual([])
    })

    it('sets changesError on failure', async () => {
      postRefine.mockRejectedValue(new Error('network down'))

      const { result } = renderHook(() => useTripState())
      await act(async () => {
        await result.current.submitRefinement()
      })

      expect(result.current.state.changesError).toBe('network down')
      expect(result.current.state.changesSubmitting).toBe(false)
    })
  })

  describe('approveItinerary', () => {
    it('moves to the itinerary stage on success', async () => {
      postItinerary.mockResolvedValue({ days: [{ day_number: 1, places: [], warnings: [] }] })

      const { result } = renderHook(() => useTripState())
      await act(async () => {
        await result.current.approveItinerary()
      })

      expect(result.current.state.stage).toBe('itinerary')
      expect(result.current.state.itinerary).toEqual([{ day_number: 1, places: [], warnings: [] }])
    })

    it('sets itineraryError on failure and leaves the stage unchanged, instead of failing silently', async () => {
      postSelect.mockResolvedValue(SUFFICIENT_SELECT_RESPONSE)
      getPlaces.mockResolvedValue({ places: [{ id: 'place_001', name: 'Uffizi' }] })
      postItinerary.mockRejectedValue(new Error('network down'))

      const { result } = renderHook(() => useTripState())
      await act(async () => {
        await result.current.submitPrompt()
      })
      expect(result.current.state.stage).toBe('map')

      await act(async () => {
        await result.current.approveItinerary()
      })

      expect(result.current.state.stage).toBe('map')
      expect(result.current.state.itineraryStatus).toBe('error')
      expect(result.current.state.itineraryError).toBe('network down')
    })
  })

  describe('restartTrip', () => {
    it('resets state back to initial values', () => {
      const { result } = renderHook(() => useTripState())
      act(() => {
        result.current.setPromptText('something')
      })
      expect(result.current.state.promptText).toBe('something')

      act(() => {
        result.current.restartTrip()
      })
      expect(result.current.state.promptText).toBe('')
      expect(result.current.state.stage).toBe('input')
    })
  })
})
