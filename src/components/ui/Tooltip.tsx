import { useId, useState } from 'react'

interface TooltipProps {
  label: string
  content: string
}

export function Tooltip({ label, content }: TooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-deep-teal/25 text-[11px] text-deep-teal"
        aria-describedby={open ? id : undefined}
        aria-label={`${label} 설명`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-64 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-left text-xs leading-relaxed text-white shadow-lg"
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
