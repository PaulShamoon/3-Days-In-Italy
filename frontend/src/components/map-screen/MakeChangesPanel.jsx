import { useTripStateContext } from '../../state/TripStateContext'
import { PROMPT_MIN_LENGTH } from '../../constants'
import { PromptField } from '../primitives/PromptField'
import { Button } from '../primitives/Button'
import { ProgressBar } from '../primitives/ProgressBar'
import { CloseIcon } from '../primitives/Icons'
import styles from './MakeChangesPanel.module.css'

const MAX_LENGTH = 500
const SUBMIT_BUTTON_STYLE = { padding: '6px 14px', fontSize: '13px' }

/**
 * Docked panel over the map for submitting a refinement prompt against
 * the current selection. Shows the out-of-region message inline when
 * the backend flags one — no "switch region" action
 */
export function MakeChangesPanel() {
  const { state, closeChanges, setChangesText, submitRefinement } = useTripStateContext()
  const { region, changesText, changesSubmitting, changesError, outOfRegionMessage } = state

  const charCount = changesText.length
  const trimmedLength = changesText.trim().length
  const tooShort = trimmedLength > 0 && trimmedLength < PROMPT_MIN_LENGTH
  const submitDisabled = trimmedLength < PROMPT_MIN_LENGTH || charCount > MAX_LENGTH || changesSubmitting

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Make changes</div>
          <div className={styles.subtitle}>Region stays locked to {region}</div>
        </div>
        <button type="button" aria-label="Close" className={styles.close} onClick={closeChanges}>
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      <div className={styles.body}>
        {outOfRegionMessage && <p className={styles.notice}>{outOfRegionMessage}</p>}
        {changesError && <p className={styles.notice}>{changesError}</p>}

        <PromptField
          label="What would you like to change?"
          value={changesText}
          onChange={setChangesText}
          placeholder="e.g. swap the bike day for something less active, and add more food spots"
          rows={3}
          disabled={changesSubmitting}
        />
        {tooShort && (
          <p className={styles.hint}>Tell us a bit more — at least {PROMPT_MIN_LENGTH} characters.</p>
        )}

        <div className={styles.submitRow}>
          <Button
            variant="primary"
            style={SUBMIT_BUTTON_STYLE}
            disabled={submitDisabled}
            loading={changesSubmitting}
            onClick={submitRefinement}
          >
            {changesSubmitting ? 'Updating…' : 'Update selection'}
          </Button>
        </div>

        {changesSubmitting && (
          <div className={styles.progressRow}>
            <ProgressBar />
            <span className={styles.progressCaption}>Refining your selection&hellip;</span>
          </div>
        )}
      </div>
    </div>
  )
}
