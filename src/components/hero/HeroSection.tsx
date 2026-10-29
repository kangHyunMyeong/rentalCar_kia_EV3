import { useEffect, useRef, useState } from 'react'
import { Container } from '@/components/ui/Container'
import { VehicleImage } from '@/components/ui/VehicleImage'
import { DEFAULT_CAR_IMAGE_MODE } from '@/data/images'
import { EV3_MODEL } from '@/data/ev3-model'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { scrollToSection } from '@/hooks/useSmoothScroll'

function HeroBackground({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="kv-bg" aria-hidden>
      <div className="kv-studio-fallback absolute inset-0" />
      {!failed ? (
        <img
          src={src}
          alt=""
          className="kv-bg-img"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  )
}

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null)
  const carRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const images = EV3_MODEL.imagePaths

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
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
        tl.fromTo('.kv-lettering', { opacity: 0 }, { opacity: 1, duration: 1 }, 0)
          .fromTo(
            '.kv-car',
            { opacity: 0, y: 20, scale: 0.988 },
            { opacity: 1, y: 0, scale: 1, duration: 1.05 },
            0.15,
          )
          .fromTo(
            '.kv-copy > *',
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.55, stagger: 0.1 },
            0.45,
          )

        const mm = gsap.matchMedia()
        mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
          if (!carRef.current) return
          gsap.to(carRef.current, {
            yPercent: -5,
            ease: 'none',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
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
    <section id="top" ref={rootRef} className="kv" aria-label="기아 EV3 키 비주얼">
      <HeroBackground src={images.kvBg} />

      <div className="kv-shell w-full">
        <div className="kv-stage relative">
          <p className="kv-lettering lettering-outline" aria-hidden>
            EV3
          </p>

          <div ref={carRef} className="kv-car relative z-10 w-full">
            <VehicleImage
              src={images.kvCar}
              mobileSrc={images.kvCarMobile}
              alt="기아 EV3 전면 3/4 뷰"
              priority
              mode={DEFAULT_CAR_IMAGE_MODE}
              className="mx-auto w-full"
              imgClassName="kv-car-img mx-auto drop-shadow-[0_24px_40px_rgba(16,58,58,0.14)]"
            />
          </div>
        </div>

        <Container className="kv-copy w-full">
          <div className="kv-copy-grid">
            <div className="kv-copy-text min-w-0">
              <p className="kv-eyebrow">THE NEW EV3</p>
              <h1 className="kv-headline">EV3, 나다운 일상의 시작.</h1>
              <p className="kv-desc">
                트림부터 계약기간까지, 원하는 조건으로 EV3 장기렌트 견적을 구성해{' '}
                <span className="kv-nowrap">보세요.</span>
              </p>
            </div>

            <div className="kv-cta min-w-0">
              <button
                type="button"
                onClick={() => scrollToSection('quote')}
                className="kv-cta-btn group"
              >
                <span>내 EV3 견적 만들기</span>
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </button>
            </div>
          </div>
        </Container>
      </div>
    </section>
  )
}
