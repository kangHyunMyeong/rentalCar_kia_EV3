import { useEffect, useId, useRef, useState } from 'react'
import { Container } from '@/components/ui/Container'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useScrollHeader } from '@/hooks/useScrollHeader'
import { scrollToSection } from '@/hooks/useSmoothScroll'
import { useQuoteStore } from '@/stores/quoteStore'

const NAV_ITEMS = [
  { id: 'why-ev3', label: 'EV3 소개' },
  { id: 'design', label: '디자인' },
  { id: 'color-studio', label: '컬러' },
  { id: 'quote', label: '예상 견적' },
  { id: 'faq', label: 'FAQ' },
] as const

type NavId = (typeof NAV_ITEMS)[number]['id']

function BrandLogo({ onNavigate }: { onNavigate: () => void }) {
  return (
    <a
      href="#top"
      className="inline-flex min-w-0 shrink-0 items-baseline gap-2 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C] sm:gap-2.5"
      aria-label="핏카 - 기아 EV3"
      title="핏카 - 기아 EV3"
      onClick={(e) => {
        e.preventDefault()
        onNavigate()
      }}
    >
      <span
        className="text-[17px] font-bold tracking-[-0.03em] text-[#103C3C] sm:text-[20px]"
        style={{ lineHeight: 1 }}
      >
        핏카 - 기아 EV3
      </span>
    </a>
  )
}

export function Header() {
  const scrolled = useScrollHeader()
  const reduced = usePrefersReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeId, setActiveId] = useState<NavId | null>(null)
  const menuId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const openConsultationModal = useQuoteStore((s) => s.openConsultationModal)

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      openButtonRef.current?.focus()
    }
  }, [menuOpen])

  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.id)
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))

    if (elements.length === 0) return

    const ratios = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }

        if (window.scrollY < 100) {
          setActiveId(null)
          return
        }

        let bestId: NavId | null = null
        let bestRatio = 0
        for (const item of NAV_ITEMS) {
          const ratio = ratios.get(item.id) ?? 0
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = item.id
          }
        }
        setActiveId(bestRatio > 0 ? bestId : null)
      },
      {
        rootMargin: '-18% 0px -52% 0px',
        threshold: [0, 0.15, 0.35, 0.55, 0.75],
      },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const go = (id: string) => {
    setMenuOpen(false)
    scrollToSection(id)
  }

  const openConsult = () => {
    setMenuOpen(false)
    openConsultationModal()
  }

  const headerSurface =
    scrolled || menuOpen
      ? 'border-b border-[rgba(20,40,42,0.1)] bg-[rgba(245,244,240,0.96)] backdrop-blur-[12px]'
      : 'border-b border-transparent bg-[rgba(245,244,240,0.72)] backdrop-blur-[8px]'

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300',
        headerSurface,
      ].join(' ')}
    >
      <Container className="relative flex h-[var(--header-h)] max-w-[1280px] items-center justify-between gap-3 px-5 md:px-12 lg:px-16">
        <BrandLogo onNavigate={() => go('top')} />

        <nav
          className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-7 lg:flex xl:gap-9"
          aria-label="주요 메뉴"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeId === item.id
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={active ? 'true' : undefined}
                className={[
                  'group relative py-1 text-[14px] tracking-tight transition-colors duration-[220ms] ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#103C3C]',
                  active
                    ? 'font-semibold text-[#103C3C]'
                    : 'font-medium text-[#4F605D] hover:text-[#103C3C]',
                ].join(' ')}
                onClick={(e) => {
                  e.preventDefault()
                  go(item.id)
                }}
              >
                {item.label}
                <span
                  aria-hidden
                  className={[
                    'absolute inset-x-0 -bottom-0.5 h-px origin-left bg-[#103C3C] transition-transform duration-[220ms] ease-out',
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                  ].join(' ')}
                />
              </a>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="group hidden h-11 items-center gap-2.5 rounded-[11px] bg-[#103C3C] px-6 text-[14px] font-semibold text-white transition-colors duration-[220ms] hover:bg-[#0c3232] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C] lg:inline-flex"
            onClick={openConsult}
          >
            <span>견적 상담</span>
            <span
              aria-hidden
              className="transition-transform duration-[220ms] group-hover:translate-x-1"
            >
              ↗
            </span>
          </button>

          <button
            ref={openButtonRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#103C3C]/20 text-[#103C3C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C] lg:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span aria-hidden className="text-lg leading-none">
              {menuOpen ? '×' : '☰'}
            </span>
          </button>
        </div>
      </Container>

      {menuOpen ? (
        <div
          className="fixed inset-0 top-[var(--header-h)] z-40 lg:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMenuOpen(false)
          }}
        >
          <div
            id={menuId}
            ref={panelRef}
            className={[
              'max-h-[calc(100svh-var(--header-h))] overflow-y-auto border-t border-[#D8D8D4] bg-[#F5F4F0]',
              reduced ? '' : 'animate-[header-panel-in_250ms_ease-out]',
            ].join(' ')}
            role="dialog"
            aria-modal="true"
            aria-label="모바일 메뉴"
          >
            <Container className="flex flex-col px-5 py-3 md:px-12">
              <div className="mb-1 flex justify-end">
                <button
                  ref={closeRef}
                  type="button"
                  className="min-h-11 rounded-lg px-3 text-sm text-[#7A817E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C]"
                  onClick={() => setMenuOpen(false)}
                >
                  닫기
                </button>
              </div>

              <nav aria-label="모바일 메뉴" className="flex flex-col">
                {NAV_ITEMS.map((item) => {
                  const active = activeId === item.id
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      aria-current={active ? 'true' : undefined}
                      className={[
                        'flex min-h-11 items-center border-b border-[#D8D8D4] text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#103C3C]',
                        active
                          ? 'font-semibold text-[#103C3C]'
                          : 'font-medium text-[#14282A]',
                      ].join(' ')}
                      onClick={(e) => {
                        e.preventDefault()
                        go(item.id)
                      }}
                    >
                      {item.label}
                    </a>
                  )
                })}
              </nav>

              <button
                type="button"
                className="group mt-5 mb-4 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[11px] bg-[#103C3C] px-6 text-[14px] font-semibold text-white transition-colors duration-[220ms] hover:bg-[#0c3232] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C]"
                onClick={openConsult}
              >
                <span>견적 상담 신청하기</span>
                <span
                  aria-hidden
                  className="transition-transform duration-[220ms] group-hover:translate-x-1"
                >
                  ↗
                </span>
              </button>
            </Container>
          </div>
        </div>
      ) : null}
    </header>
  )
}
