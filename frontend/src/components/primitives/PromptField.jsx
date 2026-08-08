import { useId } from 'react'
import { PROMPT_MAX_LENGTH } from '../../constants'
import styles from './PromptField.module.css'

/**
 * Label + textarea + live character counter, capped at PROMPT_MAX_LENGTH
 * characters both by the native `maxlength` attribute and a server-side
 * check (backend/models.py's PromptText). Reused for both the initial
 * trip prompt and the make-changes prompt
 *
 * Args:
 *   label (string): The field's label text.
 *   value (string): The current text.
 *   onChange (function): Called with the new text on every keystroke.
 *   placeholder (string): Textarea placeholder.
 *   rows (number): Textarea row count. Defaults to 5.
 *   disabled (boolean): Disables the textarea (e.g. while submitting).
 */
export function PromptField({ label, value, onChange, placeholder, rows = 5, disabled = false }) {
  const fieldId = useId()
  const charCount = value.length
  const overLimit = charCount > PROMPT_MAX_LENGTH

  return (
    <div>
      <div className={styles.field}>
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
        <textarea
          id={fieldId}
          className={styles.input}
          rows={rows}
          maxLength={PROMPT_MAX_LENGTH}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <div className={styles.counterRow}>
        <span className={`${styles.counter} ${overLimit ? styles.counterOver : ''} tabular-nums`}>
          {charCount}/{PROMPT_MAX_LENGTH}
        </span>
      </div>
    </div>
  )
}
