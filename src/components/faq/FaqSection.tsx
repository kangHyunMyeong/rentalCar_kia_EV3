import { useEffect, useRef } from 'react'
import { Container } from '@/components/ui/Container'
import { FAQ_ITEMS, FAQ_SECTION_COPY } from '@/data/faq'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { FaqAccordion } from './FaqAccordion'

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
          { opacity: 0, y: 20 },
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
      className="bg-[#F5F4F0] py-[clamp(4.5rem,10vw,7.5rem)]"
      aria-labelledby="faq-title"
    >
      <Container className="max-w-[1280px] px-5 md:px-12 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:gap-16 xl:gap-24">
          <header className="faq-fade max-w-md lg:pt-2">
            <p className="text-[12px] font-semibold tracking-[0.15em] text-[#103C3C]/75 uppercase md:text-[13px]">
              {FAQ_SECTION_COPY.eyebrow}
            </p>
            <h2
              id="faq-title"
              className="mt-5 text-[clamp(2.25rem,5vw,3.75rem)] font-semibold tracking-[-0.04em] text-[#14282A]"
              style={{ lineHeight: 1.15 }}
            >
              {FAQ_SECTION_COPY.headline.split('\n').map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-5 text-[0.95rem] leading-[1.7] whitespace-pre-line text-[#6C7572] md:text-[1.05rem]">
              {FAQ_SECTION_COPY.description}
            </p>
          </header>

          <div className="faq-fade min-w-0">
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </div>
      </Container>
    </section>
  )
}
