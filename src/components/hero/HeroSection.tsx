import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { VehicleImage } from '@/components/ui/VehicleImage'
import { DEFAULT_CAR_IMAGE_MODE } from '@/data/images'
import { EV3_MODEL } from '@/data/ev3-model'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { scrollToSection } from '@/hooks/useSmoothScroll'

function HeroBackground({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="absolute inset-0 kv-studio-fallback" aria-hidden>
      {!failed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover opacity-45"
          loading="eager"
          decoding="async"
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
        tl.fromTo('.kv-lettering', { opacity: 0 }, { opacity: 1, duration: 1.1 }, 0)
          .fromTo(
            '.kv-car',
            { opacity: 0, y: 28, scale: 0.985 },
            { opacity: 1, y: 0, scale: 1, duration: 1.15 },
            0.2,
          )
          .fromTo(
            '.kv-copy > *',
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 },
            0.55,
          )

        if (carRef.current) {
          gsap.to(carRef.current, {
            yPercent: -6,
            ease: 'none',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          })
        }
      }, rootRef)
    })()

    return () => {
      reverted = true
      ctx?.revert()
    }
  }, [reduced])

  return (
    <section
      id="top"
      ref={rootRef}
      className="relative flex min-h-[100svh] flex-col overflow-hidden pt-[var(--header-h)] md:h-[100svh] md:max-h-[100svh]"
      aria-label="EV3 키 비주얼"
    >
      <HeroBackground src={images.kvBg} />

      <div className="relative flex flex-1 flex-col md:min-h-0">
        {/* 모바일: 이미지 높이만큼만 / 데스크톱: 남은 뷰포트에 맞춤 */}
        <div className="relative shrink-0 md:flex md:min-h-0 md:flex-1 md:flex-col md:justify-center">
          <p
            className="kv-lettering lettering-outline pointer-events-none absolute left-1/2 top-0 z-0 w-[120%] -translate-x-1/2 text-center text-[clamp(3.5rem,18vw,18rem)] font-semibold leading-none tracking-[-0.04em] opacity-50 md:top-[4%] md:w-[140%] md:opacity-70"
            aria-hidden
          >
            EV3
          </p>

          <div className="relative z-10 flex justify-center px-3 pt-3 pb-0 md:min-h-0 md:flex-1 md:items-center md:px-2 md:py-3">
            <div
              ref={carRef}
              className="kv-car w-full max-w-[440px] md:flex md:h-full md:max-h-full md:w-[min(86vw,1480px)] md:max-w-none md:items-center md:justify-center lg:w-[min(90vw,1600px)]"
            >
              <VehicleImage
                src={images.kvCar}
                mobileSrc={images.kvCarMobile}
                alt="기아 EV3 전면 3/4 뷰"
                priority
                mode={DEFAULT_CAR_IMAGE_MODE}
                className="mx-auto w-full md:flex md:h-full md:max-h-full md:items-center md:justify-center"
                imgClassName="mx-auto h-auto w-full object-contain drop-shadow-[0_24px_40px_rgba(16,58,58,0.16)] md:w-auto md:max-w-full md:max-h-[min(62svh,720px)]"
              />
            </div>
          </div>
        </div>

        <Container className="kv-copy relative z-10 mt-4 grid shrink-0 gap-4 pb-8 pt-0 md:mt-0 md:grid-cols-[1.2fr_auto] md:items-end md:gap-10 md:pb-8 lg:pb-10">
          <div className="order-1 max-w-xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-deep-teal/70 uppercase">
              THE NEW EV3
            </p>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-ink md:mt-3 md:text-4xl lg:text-5xl">
              EV3, 나다운 일상의 시작.
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink-muted md:mt-4 md:text-lg">
              트림부터 계약기간까지, 원하는 조건으로 EV3 장기렌트 견적을 구성해 보세요.
            </p>
          </div>

          <div className="order-2">
            <Button size="lg" arrow onClick={() => scrollToSection('quote')}>
              내 EV3 견적 만들기
            </Button>
          </div>
        </Container>
      </div>
    </section>
  )
}
