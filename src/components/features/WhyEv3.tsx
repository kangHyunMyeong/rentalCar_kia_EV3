import { useEffect, useRef } from 'react'
import { Container } from '@/components/ui/Container'
import { WHY_EV3_COPY, WHY_EV3_SPECS } from '@/data/features'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

function formatCount(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value))
}

export function WhyEv3() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!rootRef.current || reduced) return

    let reverted = false
    let ctx: { revert: () => void } | null = null

    void (async () => {
      const gsap = (await import('gsap')).default
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      if (reverted || !rootRef.current) return

      gsap.registerPlugin(ScrollTrigger)

      ctx = gsap.context(() => {
        gsap.fromTo(
          '.why-fade-up',
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 75%',
              once: true,
            },
          },
        )

        gsap.fromTo(
          '.why-spec-item',
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.14,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '.why-specs',
              start: 'top 85%',
              once: true,
            },
          },
        )

        rootRef.current
          ?.querySelectorAll<HTMLElement>('[data-count-to]')
          .forEach((el, index) => {
            const target = Number(el.dataset.countTo)
            if (!Number.isFinite(target)) return

            const state = { value: 0 }
            el.textContent = '0'

            gsap.to(state, {
              value: target,
              duration: 1.35,
              delay: 0.18 + index * 0.12,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 90%',
                once: true,
              },
              onUpdate: () => {
                el.textContent = formatCount(state.value)
              },
              onComplete: () => {
                el.textContent = formatCount(target)
              },
            })
          })
      }, rootRef)
    })()

    return () => {
      reverted = true
      ctx?.revert()
    }
  }, [reduced])

  return (
    <section
      id="why-ev3"
      ref={rootRef}
      className="relative flex min-h-[650px] items-center overflow-x-hidden bg-deep-teal md:min-h-[720px] lg:min-h-[750px]"
      aria-labelledby="why-ev3-title"
    >
      <Container className="flex w-full min-w-0 flex-col justify-center py-16 md:py-20">
        <header className="min-w-0">
          <div className="why-fade-up flex items-center gap-4 md:gap-6">
            <p className="shrink-0 text-xs font-semibold tracking-[0.22em] text-soft-mint/80 uppercase">
              {WHY_EV3_COPY.index} / {WHY_EV3_COPY.eyebrow}
            </p>
            <span
              className="h-px min-w-0 flex-1 bg-white/18"
              aria-hidden
            />
          </div>

          <div className="mt-5 max-w-3xl">
            <h2
              id="why-ev3-title"
              className="why-fade-up text-balance text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.2] tracking-tight text-[#F4F1EC]"
            >
              {WHY_EV3_COPY.title}
            </h2>
            <p className="why-fade-up mt-5 max-w-xl text-base leading-relaxed text-[#C9D0D0] md:text-lg">
              {WHY_EV3_COPY.description}
            </p>
          </div>
        </header>

        <ul className="why-specs mt-14 grid min-w-0 gap-0 md:mt-24 md:grid-cols-3">
          {WHY_EV3_SPECS.map((spec, index) => (
            <li
              key={spec.id}
              className={[
                'why-spec-item min-w-0 py-10 md:px-8 md:py-2',
                index === 0 ? 'border-t border-white/15 md:border-t-0 md:pl-0' : '',
                index === WHY_EV3_SPECS.length - 1 ? 'md:pr-0' : '',
                index > 0
                  ? 'border-t border-white/15 md:border-t-0 md:border-l md:border-white/15'
                  : '',
              ].join(' ')}
            >
              <p className="flex flex-wrap items-baseline gap-2">
                <span
                  className="text-[clamp(2.5rem,5vw,3.75rem)] font-semibold tracking-tight text-[#F4F1EC] tabular-nums"
                  {...(spec.countTo != null
                    ? {
                        'data-count-to': spec.countTo,
                        'aria-label': `${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`,
                      }
                    : {})}
                >
                  {spec.value}
                </span>
                {spec.unit ? (
                  <span className="text-base font-medium text-soft-mint md:text-lg">
                    {spec.unit}
                  </span>
                ) : null}
              </p>
              <p className="mt-4 text-sm font-medium tracking-wide text-[#C9D0D0] md:mt-5 md:text-base">
                {spec.label}
              </p>
              {spec.note ? (
                <p className="mt-3 max-w-prose break-keep text-[13px] leading-[1.55] text-[#C9D0D0]/90 md:mt-3.5 md:text-sm md:leading-[1.6]">
                  {spec.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
