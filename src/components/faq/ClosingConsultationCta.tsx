import { useEffect, useRef } from 'react'
import { Container } from '@/components/ui/Container'
import { CLOSING_CTA_COPY, CLOSING_CTA_IMAGE } from '@/data/faq'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { scrollToSection } from '@/hooks/useSmoothScroll'
import { useQuoteStore } from '@/stores/quoteStore'

export function ClosingConsultationCta() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const openConsultationModal = useQuoteStore((s) => s.openConsultationModal)

  useEffect(() => {
    if (!rootRef.current || reduced) return

    let disposed = false
    let ctx: { revert: () => void } | null = null

    void (async () => {
      const gsap = (await import('gsap')).default
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      if (disposed || !rootRef.current) return
      gsap.registerPlugin(ScrollTrigger)

      ctx = gsap.context(() => {
        gsap.fromTo(
          '.cta-fade',
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 78%',
              once: true,
            },
          },
        )

        gsap.fromTo(
          '.cta-bg-scale',
          { scale: 1.02 },
          {
            scale: 1,
            duration: 1.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 80%',
              once: true,
            },
          },
        )
      }, rootRef)
    })()

    return () => {
      disposed = true
      ctx?.revert()
    }
  }, [reduced])

  return (
    <section
      id="consultation-cta"
      ref={rootRef}
      className="closing-cta relative isolate overflow-hidden"
      aria-labelledby="closing-cta-title"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={CLOSING_CTA_IMAGE}
          alt=""
          aria-hidden
          className="cta-bg-scale closing-cta-bg h-full w-full object-cover"
        />
        <div className="closing-cta-overlay absolute inset-0" aria-hidden />
      </div>

      <Container className="closing-cta-shell relative">
        <div className="closing-cta-copy text-left">
          <p className="cta-fade closing-cta-eyebrow">{CLOSING_CTA_COPY.eyebrow}</p>

          <h2 id="closing-cta-title" className="cta-fade closing-cta-title">
            내 EV3 견적,
            <br className="closing-cta-title-break" />
            <span className="closing-cta-title-rest">
              {' '}
              이제 상담으로 <span className="closing-cta-nowrap">완성하세요.</span>
            </span>
          </h2>

          <p className="cta-fade closing-cta-desc">
            선택하신 조건을 바탕으로 실제 적용 가능한 렌트 조건을 확인해 보세요.
          </p>

          <div className="cta-fade closing-cta-actions">
            <button
              type="button"
              onClick={openConsultationModal}
              className="group closing-cta-primary"
            >
              <span>{CLOSING_CTA_COPY.primaryLabel}</span>
              <span
                aria-hidden
                className="transition-transform duration-[250ms] group-hover:translate-x-1"
              >
                ↗
              </span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('quote')}
              className="group closing-cta-secondary"
            >
              <span>{CLOSING_CTA_COPY.secondaryLabel}</span>
              <span
                aria-hidden
                className="transition-transform duration-[250ms] group-hover:translate-x-1"
              >
                →
              </span>
            </button>
          </div>
        </div>
      </Container>
    </section>
  )
}
