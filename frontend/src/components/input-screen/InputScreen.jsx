import { useTripStateContext } from '../../state/TripStateContext'
import { PROMPT_MIN_LENGTH } from '../../constants'
import { PromptField } from '../primitives/PromptField'
import { Hairline } from '../primitives/Hairline'
import { Button } from '../primitives/Button'
import { ArrowIcon } from '../primitives/Icons'
import { BusyLevelPicker } from './BusyLevelPicker'
import styles from './InputScreen.module.css'

const MAX_LENGTH = 500

/** Landing screen: free-text prompt + busy-level pick + submit. */
export function InputScreen() {
  const { state, setPromptText, setBusyLevel, submitPrompt } = useTripStateContext()
  const { promptText, busyLevel, selectMeta, selectStatus, selectError } = state

  const charCount = promptText.length
  const trimmedLength = promptText.trim().length
  const tooShort = trimmedLength > 0 && trimmedLength < PROMPT_MIN_LENGTH
  const submitDisabled = trimmedLength < PROMPT_MIN_LENGTH || charCount > MAX_LENGTH || selectStatus === 'pending'

  return (
    <div className={styles.screen}>
      <div className={styles.heading}>
        <div className={styles.kicker}>Three Days &middot; Italy</div>
        <h1 className={styles.headline}>Tell us the trip you&rsquo;re after</h1>
        <p className={styles.subhead}>
          Describe the pace, places and interests you have in mind. We&rsquo;ll pick one region and a
          first set of places to match.
        </p>
      </div>

      <div className={styles.hairlineRow}>
        <Hairline />
      </div>

      {selectMeta?.insufficientMatches && (
        <p className={styles.banner}>
          Only {selectMeta.matchedCount} places matched — try broadening your interests or busy level.
        </p>
      )}

      {selectStatus === 'error' && (
        <p className={styles.banner}>{selectError ?? 'Something went wrong — please try again.'}</p>
      )}

      <div className={styles.field}>
        <PromptField
          label="Your trip, in your words"
          value={promptText}
          onChange={setPromptText}
          placeholder="e.g. relaxing coastal trip, love local food, into wine and quiet towns, not really a museum person"
          rows={5}
        />
        {tooShort && (
          <p className={styles.hint}>
            Tell us a bit more — at least {PROMPT_MIN_LENGTH} characters.
          </p>
        )}
      </div>

      <div className={styles.field}>
        <BusyLevelPicker busyLevel={busyLevel} onChange={setBusyLevel} />
      </div>

      <Button variant="primary" block disabled={submitDisabled} onClick={submitPrompt}>
        Plan my trip
        <ArrowIcon />
      </Button>
      <p className={styles.footnote}>Fixed at 3 days &middot; region is chosen from your prompt or picked for you</p>
    </div>
  )
}
