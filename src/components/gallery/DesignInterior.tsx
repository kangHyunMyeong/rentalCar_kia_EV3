import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Container } from '@/components/ui/Container'
import {
  DESIGN_FEATURE_BLOCKS,
  DESIGN_SECTION,
  getGalleryByCategory,
} from '@/data/gallery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { GallerySlide } from '@/types'

const GalleryLightbox = lazy(() =>
  import('./GalleryLightbox').then((m) => ({ default: m.GalleryLightbox })),
)

type GalleryCategory = GallerySlide['category']

export function DesignInterior() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const [lightbox, setLightbox] = useState<{
    category: GalleryCategory
    index: number
  } | null>(null)

  const activeSlides = useMemo(
    () => (lightbox ? getGalleryByCategory(lightbox.category) : []),
    [lightbox],
  )

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
          '.design-reveal',
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 72%',
              once: true,
            },
          },
        )
      }, rootRef)
    })()

    return () => {
      reverted = true
      ctx?.revert()
    }
  }, [reduced])

  const openGallery = (category: GalleryCategory) => {
    setLightbox({ category, index: 0 })
  }

  return (
    <section
      id="design"
      ref={rootRef}
      className="relative overflow-x-hidden bg-[#F7F9F8] pb-[clamp(3.5rem,7vw,6.5rem)] pt-16 md:pb-24 md:pt-[100px] lg:pt-[120px]"
      aria-labelledby="design-title"
    >
      <Container className="min-w-0">
        <header className="design-reveal mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-deep-teal/70 uppercase">
            {DESIGN_SECTION.index} / {DESIGN_SECTION.eyebrow}
          </p>
          <h2
            id="design-title"
            className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl"
          >
            {DESIGN_SECTION.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
            {DESIGN_SECTION.description}
          </p>
        </header>

        <div className="grid min-w-0 grid-cols-1 gap-10 md:grid-cols-[1.38fr_1fr] md:items-start md:gap-8 lg:gap-12">
          {DESIGN_FEATURE_BLOCKS.map((block) => {
            const isExterior = block.id === 'exterior'
            const ctaLabel = isExterior
              ? 'Exterior 자세히 보기 ↗'
              : 'Interior 자세히 보기 ↗'

            return (
              <figure
                key={block.id}
                className={[
                  'design-reveal group/card min-w-0',
                  isExterior ? 'md:mt-0' : 'md:mt-20 lg:mt-28',
                ].join(' ')}
              >
                <button
                  type="button"
                  className="group/media block w-full min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep-teal"
                  onClick={() => openGallery(block.id)}
                  aria-haspopup="dialog"
                  aria-label={ctaLabel}
                >
                  {isExterior ? (
                    <span
                      className="block overflow-hidden"
                      style={{ aspectRatio: `${block.width} / ${block.height}` }}
                    >
                      <img
                        src={block.mainSrc}
                        alt={block.mainAlt}
                        width={block.width}
                        height={block.height}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/media:scale-[1.015]"
                        style={{ objectPosition: block.objectPosition }}
                      />
                    </span>
                  ) : (
                    <span className="block overflow-hidden leading-none">
                      <img
                        src={block.mainSrc}
                        alt={block.mainAlt}
                        width={block.width}
                        height={block.height}
                        loading="lazy"
                        decoding="async"
                        className="h-auto w-full max-w-full object-contain transition-transform duration-500 ease-out group-hover/media:scale-[1.015]"
                        style={{
                          aspectRatio: `${block.width} / ${block.height}`,
                          objectPosition: block.objectPosition,
                        }}
                      />
                    </span>
                  )}
                </button>

                <figcaption className="mt-5 min-w-0 md:mt-6">
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-deep-teal/65 uppercase">
                    {block.category}
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-ink md:text-xl">
                    {block.title}
                  </p>
                  <p className="mt-2 max-w-md text-[13px] leading-[1.55] text-ink-muted md:text-sm md:leading-[1.6]">
                    {block.description}
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center text-sm font-medium text-deep-teal underline decoration-deep-teal/25 underline-offset-[5px] transition-colors duration-200 hover:text-[#0c2f2f] hover:decoration-deep-teal group-hover/card:decoration-deep-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep-teal"
                    onClick={() => openGallery(block.id)}
                    aria-haspopup="dialog"
                  >
                    {ctaLabel}
                  </button>
                </figcaption>
              </figure>
            )
          })}
        </div>
      </Container>

      {lightbox ? (
        <Suspense fallback={null}>
          <GalleryLightbox
            open
            label={lightbox.category === 'interior' ? 'INTERIOR' : 'EXTERIOR'}
            slides={activeSlides}
            initialIndex={lightbox.index}
            onClose={() => setLightbox(null)}
          />
        </Suspense>
      ) : null}
    </section>
  )
}
