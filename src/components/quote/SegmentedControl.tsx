import { Tooltip } from '@/components/ui/Tooltip'
import { getDisabledReason, isOptionDisabled } from '@/stores/quoteStore'
import type { QuoteSelection } from '@/types'

interface OptionItem<T extends string | number> {
  value: T
  label: string
  badge?: string
  subLabel?: string
}

interface SegmentedControlProps<T extends string | number> {
  legend: string
  tooltip?: { label: string; content: string }
  field: keyof QuoteSelection
  options: OptionItem<T>[]
  value: T
  selection: QuoteSelection
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string | number>({
  legend,
  tooltip,
  field,
  options,
  value,
  selection,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2.5 flex items-center text-[1.05rem] font-medium text-[#171B1B]">
        {legend}
        {tooltip ? <Tooltip label={tooltip.label} content={tooltip.content} /> : null}
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => {
          const disabled = isOptionDisabled(
            field,
            opt.value as QuoteSelection[keyof QuoteSelection],
            selection,
          )
          const reason = disabled
            ? getDisabledReason({ ...selection, [field]: opt.value })
            : null
          const selected = value === opt.value

          return (
            <button
              key={String(opt.value)}
              type="button"
              disabled={disabled}
              title={reason ?? undefined}
              aria-pressed={selected}
              className={[
                'relative min-h-[3.15rem] min-w-12 rounded-[10px] border px-4 py-2.5 text-[1.02rem] transition-all duration-200',
                selected
                  ? 'border-deep-teal bg-deep-teal/5 font-semibold text-deep-teal'
                  : 'border-[#E2E0DB] bg-white text-[#171B1B] hover:border-deep-teal/40',
                disabled ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
              onClick={() => onChange(opt.value)}
            >
              <span className="inline-flex flex-col items-start gap-0.5">
                <span className="inline-flex items-center gap-1.5">
                  {opt.label}
                  {opt.badge ? (
                    <span
                      className={[
                        'rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide',
                        selected
                          ? 'bg-deep-teal text-white'
                          : 'bg-deep-teal/10 text-deep-teal',
                      ].join(' ')}
                    >
                      {opt.badge}
                    </span>
                  ) : null}
                </span>
                {opt.subLabel ? (
                  <span className="text-xs font-normal text-[#6B7474]">{opt.subLabel}</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
