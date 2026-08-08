import { describe, it, expect } from 'vitest'
import { mergeSelectionWithCatalog } from './mergePlaces'

describe('mergeSelectionWithCatalog', () => {
  it('returns an empty array for an empty selection', () => {
    expect(mergeSelectionWithCatalog([], {})).toEqual([])
  })

  it('merges each selected id with its catalog entry, attaching reason and a 1-based number', () => {
    const selection = [
      { id: 'place_001', reason: 'great food' },
      { id: 'place_002', reason: 'quiet' },
    ]
    const catalog = {
      place_001: { id: 'place_001', name: 'Uffizi' },
      place_002: { id: 'place_002', name: 'Duomo' },
    }

    const merged = mergeSelectionWithCatalog(selection, catalog)

    expect(merged).toEqual([
      { id: 'place_001', name: 'Uffizi', reason: 'great food', number: 1 },
      { id: 'place_002', name: 'Duomo', reason: 'quiet', number: 2 },
    ])
  })

  it('drops ids missing from the catalog without leaving a gap in the numbering', () => {
    const selection = [
      { id: 'place_001', reason: 'a' },
      { id: 'place_999', reason: 'missing from catalog' },
      { id: 'place_002', reason: 'b' },
    ]
    const catalog = {
      place_001: { id: 'place_001', name: 'Uffizi' },
      place_002: { id: 'place_002', name: 'Duomo' },
    }

    const merged = mergeSelectionWithCatalog(selection, catalog)

    expect(merged.map((p) => p.id)).toEqual(['place_001', 'place_002'])
    // Numbering is sequential over the merged output, not the original
    // selection index -- place_002 should be #2, not #3.
    expect(merged.map((p) => p.number)).toEqual([1, 2])
  })
})
