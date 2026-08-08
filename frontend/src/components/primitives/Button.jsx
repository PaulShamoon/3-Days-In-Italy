import styles from './Button.module.css'
import { Spinner } from './Spinner'

const VARIANT_CLASS = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
}

/**
 * Shared button primitive
 *
 * Args:
 *   variant ('primary'|'secondary'|'ghost'): Visual style. Defaults to 'primary'.
 *   block (boolean): Full-width layout.
 *   loading (boolean): Shows a spinner before the label and disables the button.
 *   disabled (boolean): Disables the button.
 *   onClick (function): Click handler.
 *   children (ReactNode): Button label (and optional trailing icon).
 */
export function Button({
  variant = 'primary',
  block = false,
  loading = false,
  disabled = false,
  onClick,
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${VARIANT_CLASS[variant]} ${block ? styles.block : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading && <Spinner size={12} variant={variant === 'primary' ? 'inverse' : 'accent'} />}
      {children}
    </button>
  )
}
