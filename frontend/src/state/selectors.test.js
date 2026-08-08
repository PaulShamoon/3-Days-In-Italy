import { describe, it, expect } from 'vitest'
import { selectWorkingPlaces, selectApproveGate } from './selectors'

describe('selectWorkingPlaces', () => {
  it('joins selection against the catalog, in selection order', () => {
    const state = {
      selection: [
        { id: 'place_002', reason: 'second' },
        { id: 'place_001', reason: 'first' },
      ],
      placeCatalog: {
        place_001: { id: 'place_001', name: 'Uffizi' },
        place_002: { id: 'place_002', name: 'Duomo' },
      },
    }

    const places = selectWorkingPlaces(state)

    expect(places.map((p) => p.id)).toEqual(['place_002', 'place_001'])
    expect(places[0]).toMatchObject({ name: 'Duomo', reason: 'second', number: 1 })
    expect(places[1]).toMatchObject({ name: 'Uffizi', reason: 'first', number: 2 })
  })
})

describe('selectApproveGate', () => {
  it('cannot approve when selectMeta is missing (requiredMinimum defaults to Infinity)', () => {
    const gate = selectApproveGate({ selectMeta: null, selection: [{ id: 'place_001', reason: 'a' }] })
    expect(gate.canApprove).toBe(false)
    expect(gate.requiredMinimum).toBe(Infinity)
    expect(gate.currentCount).toBe(1)
  })

  it('cannot approve when currentCount is below the minimum', () => {
    const gate = selectApproveGate({
      selectMeta: { targetCountMin: 6 },
      selection: Array.from({ length: 5 }, (_, i) => ({ id: `place_${i}`, reason: 'a' })),
    })
    expect(gate.canApprove).toBe(false)
    expect(gate.currentCount).toBe(5)
    expect(gate.requiredMinimum).toBe(6)
  })

  it('can approve exactly at the minimum', () => {
    const gate = selectApproveGate({
      selectMeta: { targetCountMin: 6 },
      selection: Array.from({ length: 6 }, (_, i) => ({ id: `place_${i}`, reason: 'a' })),
    })
    expect(gate.canApprove).toBe(true)
  })

  it('can approve above the minimum', () => {
    const gate = selectApproveGate({
      selectMeta: { targetCountMin: 6 },
      selection: Array.from({ length: 9 }, (_, i) => ({ id: `place_${i}`, reason: 'a' })),
    })
    expect(gate.canApprove).toBe(true)
  })
})
