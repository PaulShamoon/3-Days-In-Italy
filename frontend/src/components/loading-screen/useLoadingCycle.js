import { useEffect, useState } from 'react'
import { LOADING_STEPS } from '../../constants'

const STEP_MS = 1400

/**
 * Cycles through LOADING_STEPS on a fixed timer — purely cosmetic
 *
 * Returns:
 *   object: { message: string }.
 */
export function useLoadingCycle() {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((current) => (current + 1) % LOADING_STEPS.length)
    }, STEP_MS)
    return () => clearInterval(interval)
  }, [])

  return { message: LOADING_STEPS[stepIndex] }
}
