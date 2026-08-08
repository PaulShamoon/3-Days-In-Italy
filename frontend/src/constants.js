/**
 * Display copy only — shown on the busy-level picker before any
 * selection has happened, so the actual gating target (target_count_min
 * from SelectionResponse) isn't known yet. Matches backend's
 * BUSY_LEVEL_RANGE x TRIP_LENGTH_DAYS (see backend/models.py), but
 * intentionally not imported from anywhere — this is copy text, not
 * logic, and never used for a real gate decision.
 */
export const BUSY_LEVEL_META = {
  chill: { label: 'Chill', perDay: '2-3', total: '6-9' },
  busy: { label: 'Busy', perDay: '4-5', total: '12-15' },
  packed: { label: 'Packed', perDay: '6+', total: '18+' },
}

export const BUSY_LEVELS = ['chill', 'busy', 'packed']

/**
 * Minimum (trimmed) characters required for any prompt field
 */
export const PROMPT_MIN_LENGTH = 15

/** Maximum prompt length, both fields. Matches backend/models.py's PromptText max_length. */
export const PROMPT_MAX_LENGTH = 500

/** Rotating status text shown on the loading screen while /select runs. */
export const LOADING_STEPS = [
  'Reading your prompt…',
  'Matching your region…',
  'Selecting places…',
]
