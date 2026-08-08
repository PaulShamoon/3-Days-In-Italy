import { describe, it, expect } from 'vitest'
import { formatType, formatDuration } from './formatPlace'

describe('formatType', () => {
  it('replaces underscores with spaces and capitalizes the first letter', () => {
    expect(formatType('historic_site')).toBe('Historic site')
  })

  it('leaves a single-word type capitalized', () => {
    expect(formatType('restaurant')).toBe('Restaurant')
  })
})

describe('formatDuration', () => {
  it('returns null for a missing duration', () => {
    expect(formatDuration(null)).toBeNull()
  })

  it('formats sub-hour durations in minutes', () => {
    expect(formatDuration(45)).toBe('45 min')
  })

  it('formats exactly one hour as singular', () => {
    expect(formatDuration(60)).toBe('1 hr')
  })

  it('formats a fractional hour, rounded to one decimal', () => {
    expect(formatDuration(90)).toBe('1.5 hrs')
  })

  it('formats multiple whole hours as plural', () => {
    expect(formatDuration(120)).toBe('2 hrs')
  })
})
