import { useEffect, useRef } from 'react'
import { Container } from '@/components/ui/Container'
import { FAQ_ITEMS, FAQ_SECTION_COPY } from '@/data/faq'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { FaqAccordion } from './FaqAccordion'
import { FitcarTrustPanel } from './FitcarTrustPanel'

export function FaqSection() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

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
          '.faq-fade',
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 78%',
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
      id="faq"
      ref={rootRef}
      className="faq-trust-section"
      aria-labelledby="faq-title"
    >
      <Container className="faq-trust-shell max-w-[1280px] px-0 md:px-12 lg:px-16">
        <div className="faq-trust-grid">
          <aside className="faq-fade faq-trust-aside" aria-label="핏카컴퍼니 신뢰 지표">
            <FitcarTrustPanel />
          </aside>

          <div className="faq-fade faq-trust-main">
            <header className="faq-trust-main__header">
              <p className="faq-trust-main__eyebrow">{FAQ_SECTION_COPY.eyebrow}</p>
              <h2 id="faq-title" className="faq-trust-main__title">
                {FAQ_SECTION_COPY.headline.split('\n').map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h2>
              <p className="faq-trust-main__desc">{FAQ_SECTION_COPY.description}</p>
            </header>

            <div className="faq-trust-main__list min-w-0">
              <FaqAccordion items={FAQ_ITEMS} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
