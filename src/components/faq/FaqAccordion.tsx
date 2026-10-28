import { useId, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { FaqItem } from '@/types'

interface FaqAccordionProps {
  items: FaqItem[]
  /** 기본으로 열릴 항목 id. 없으면 첫 항목 */
  defaultOpenId?: string
}

export function FaqAccordion({ items, defaultOpenId }: FaqAccordionProps) {
  const baseId = useId()
  const reduced = usePrefersReducedMotion()
  const initialOpen = defaultOpenId ?? items[0]?.id ?? null
  const [openId, setOpenId] = useState<string | null>(initialOpen)

  const toggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <div className="border-t border-[#D8D8D4]">
      {items.map((item, index) => {
        const isOpen = openId === item.id
        const panelId = `${baseId}-panel-${index}`
        const buttonId = `${baseId}-button-${index}`

        return (
          <div key={item.id} className="border-b border-[#D8D8D4]">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-start justify-between gap-6 py-7 text-left text-[1.125rem] leading-snug font-semibold tracking-tight text-[#14282A] transition-colors hover:text-[#103C3C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C] md:py-8 md:text-[1.35rem]"
                onClick={() => toggle(item.id)}
              >
                <span className="pr-2">{item.question}</span>
                <span
                  aria-hidden
                  className="mt-0.5 shrink-0 text-xl font-light text-[#103C3C] md:text-2xl"
                >
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={[
                'grid transition-[grid-template-rows,opacity]',
                reduced ? 'duration-0' : 'duration-300 ease-in-out',
                isOpen
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0',
              ].join(' ')}
            >
              <div className="overflow-hidden">
                <div className="pb-7 md:pb-8">
                  {item.answer.split('\n\n').map((paragraph, i) => (
                    <p
                      key={`${item.id}-p-${i}`}
                      className="max-w-prose text-[0.95rem] leading-[1.7] text-[#6C7572] md:text-base [&+p]:mt-3"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
