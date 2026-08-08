const DEFAULT_PROPS = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/** Line icons shared across screens — all inherit color via currentColor. */

export function ArrowIcon(props) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

export function DownloadIcon(props) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <path d="M12 15V3" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

export function MapPinIcon(props) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
