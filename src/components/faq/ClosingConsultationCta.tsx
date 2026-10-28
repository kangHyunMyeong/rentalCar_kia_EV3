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
      className="relative isolate overflow-hidden"
      aria-labelledby="closing-cta-title"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={CLOSING_CTA_IMAGE}
          alt=""
          aria-hidden
          className="cta-bg-scale h-full w-full object-cover object-[68%_center] md:object-[72%_center]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[rgba(10,55,55,0.9)] via-[rgba(10,55,55,0.55)] to-[rgba(10,55,55,0.18)] max-md:from-[rgba(10,55,55,0.92)] max-md:via-[rgba(10,55,55,0.72)] max-md:to-[rgba(10,55,55,0.45)]"
          aria-hidden
        />
      </div>

      <Container className="relative flex min-h-[min(88svh,560px)] max-w-[1280px] items-center px-5 py-16 md:min-h-[560px] md:px-12 md:py-20 lg:min-h-[580px] lg:px-16">
        <div className="max-w-xl text-left">
          <p className="cta-fade text-[12px] font-semibold tracking-[0.18em] text-white/75 uppercase md:text-[13px]">
            {CLOSING_CTA_COPY.eyebrow}
          </p>

          <h2
            id="closing-cta-title"
            className="cta-fade mt-4 text-[clamp(2.125rem,4.5vw,3.5rem)] font-semibold tracking-tight text-white"
            style={{ lineHeight: 1.2 }}
          >
            {CLOSING_CTA_COPY.headline.split('\n').map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>

          <p className="cta-fade mt-4 max-w-md text-[0.95rem] leading-[1.7] whitespace-pre-line text-white/82 md:text-[1.05rem]">
            {CLOSING_CTA_COPY.description}
          </p>

          <div className="cta-fade mt-8 flex flex-col items-start gap-4 sm:mt-10">
            <button
              type="button"
              onClick={openConsultationModal}
              className="group inline-flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-[3px] bg-[#F5F4F0] px-8 py-[1.15rem] text-base font-semibold text-[#14282A] transition-[background-color] duration-[250ms] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto sm:px-[2.125rem]"
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
              className="group inline-flex items-center gap-2 border-b border-white/55 pb-1 text-[0.95rem] font-medium text-white transition-colors duration-[250ms] hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
