import { useCallback, useEffect, useRef, useState } from 'react'
import { Container } from '@/components/ui/Container'
import {
  COLOR_STUDIO,
  EXTERIOR_COLORS,
  getExteriorColorById,
  preloadColorImage,
} from '@/data/colors'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useQuoteStore } from '@/stores/quoteStore'
import type { ExteriorColor, ExteriorColorId } from '@/types'

type TimelineLike = { kill: () => void }

/** 스와치 hex → 은은한 ambient glow */
function toAmbientGlow(hex: string): string {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return 'rgba(200, 210, 210, 0.28)'
  const r = Number.parseInt(raw.slice(0, 2), 16)
  const g = Number.parseInt(raw.slice(2, 4), 16)
  const b = Number.parseInt(raw.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, 0.22)`
}

function ambientBackground(hex: string): string {
  return `radial-gradient(ellipse 72% 58% at 50% 58%, ${toAmbientGlow(hex)} 0%, transparent 72%)`
}

function ColorSwatch({
  color,
  selected,
  reduced,
  onSelect,
}: {
  color: ExteriorColor
  selected: boolean
  reduced: boolean
  onSelect: (id: ExteriorColorId) => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleClick = async () => {
    if (!reduced && btnRef.current) {
      const gsap = (await import('gsap')).default
      gsap.fromTo(
        btnRef.current,
        { scale: 1 },
        {
          scale: 1.08,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
          overwrite: 'auto',
        },
      )
    }
    onSelect(color.id)
  }

  return (
    <button
      ref={btnRef}
      id={`color-swatch-${color.id}`}
      type="button"
      className={[
        'relative flex h-11 w-11 items-center justify-center rounded-full will-change-transform md:h-12 md:w-12',
        'transition-[box-shadow] duration-300 ease-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep-teal',
        selected ? '' : 'hover:scale-105',
      ].join(' ')}
      style={{
        backgroundColor: color.swatch,
        boxShadow: selected
          ? `0 0 0 2px #F7F9F8, 0 0 0 4px ${color.swatchBorder ?? '#103A3A'}`
          : `inset 0 0 0 1px ${color.swatchBorder ?? 'rgba(0,0,0,0.12)'}`,
      }}
      aria-label={`${color.name} 외장 컬러${selected ? ', 선택됨' : ''}`}
      onClick={() => {
        void handleClick()
      }}
    />
  )
}

export function ColorStudio() {
  const exteriorColorId = useQuoteStore((s) => s.exteriorColorId)
  const setExteriorColor = useQuoteStore((s) => s.setExteriorColor)
  const reduced = usePrefersReducedMotion()

  const rootRef = useRef<HTMLElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const baseImgRef = useRef<HTMLImageElement>(null)
  const nextImgRef = useRef<HTMLImageElement>(null)
  const labelOutRef = useRef<HTMLDivElement>(null)
  const labelInRef = useRef<HTMLDivElement>(null)

  const [baseId, setBaseId] = useState<ExteriorColorId>(exteriorColorId)
  const [displayId, setDisplayId] = useState<ExteriorColorId>(exteriorColorId)

  const requestSeq = useRef(0)
  const transitionTl = useRef<TimelineLike | null>(null)
  const labelTl = useRef<TimelineLike | null>(null)

  const baseColor = getExteriorColorById(baseId)
  const displayColor = getExteriorColorById(displayId)
  const selectedColor = getExteriorColorById(exteriorColorId)

  /**
   * 초기 로드에서 전 컬러(약 560KB)를 한꺼번에 받지 않도록,
   * 컬러 스튜디오 근접 시점에 기본 컬러 우선 → 나머지 순차 preload.
   * 선택 시 selectColor가 이미 preload를 await하므로 UX 깜빡임은 방지됩니다.
   */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let cancelled = false
    let started = false

    const preloadNearViewport = async () => {
      if (cancelled || started) return
      started = true
      const preferredId = useQuoteStore.getState().exteriorColorId
      const ordered = [
        ...EXTERIOR_COLORS.filter((c) => c.id === preferredId),
        ...EXTERIOR_COLORS.filter((c) => c.id !== preferredId),
      ]
      for (const color of ordered) {
        if (cancelled) return
        await preloadColorImage(color.imageSrc).catch(() => undefined)
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void preloadNearViewport()
          io.disconnect()
        }
      },
      { rootMargin: '240px 0px', threshold: 0.01 },
    )
    io.observe(root)

    return () => {
      cancelled = true
      io.disconnect()
    }
  }, [])

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
        gsap
          .timeline({
            defaults: { ease: 'power2.out' },
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 72%',
              once: true,
            },
          })
          .fromTo('.cs-label', { opacity: 0 }, { opacity: 1, duration: 0.45 }, 0)
          .fromTo(
            '.cs-title',
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.55 },
            0.08,
          )
          .fromTo(
            '.cs-desc',
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.45 },
            0.16,
          )
          .fromTo(
            '.cs-stage',
            { opacity: 0, scale: 0.97 },
            { opacity: 1, scale: 1, duration: 0.65 },
            0.12,
          )
          .fromTo(
            '.cs-meta',
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4 },
            0.35,
          )
          .fromTo(
            '.cs-swatches',
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.4 },
            0.42,
          )
      }, rootRef)
    })()

    return () => {
      disposed = true
      ctx?.revert()
      transitionTl.current?.kill()
      labelTl.current?.kill()
    }
  }, [reduced])

  const animateLabel = useCallback(
    async (nextId: ExteriorColorId, seq: number) => {
      if (nextId === displayId) return

      const next = getExteriorColorById(nextId)

      if (reduced || !labelOutRef.current || !labelInRef.current) {
        setDisplayId(nextId)
        return
      }

      const gsap = (await import('gsap')).default
      if (seq !== requestSeq.current) return

      labelTl.current?.kill()

      const outEl = labelOutRef.current
      const inEl = labelInRef.current

      inEl.replaceChildren()
      const code = document.createElement('p')
      code.className =
        'text-xs font-semibold tracking-[0.16em] text-deep-teal/60 uppercase'
      code.textContent = next.code
      const name = document.createElement('p')
      name.className = 'mt-2 text-lg font-semibold text-ink md:text-xl'
      name.textContent = next.name
      const nameEn = document.createElement('p')
      nameEn.className = 'mt-1 text-sm text-ink-muted'
      nameEn.textContent = next.nameEn
      inEl.append(code, name, nameEn)

      gsap.set(inEl, { opacity: 0, y: 10, position: 'absolute', left: 0, right: 0, top: 0 })
      gsap.set(outEl, { opacity: 1, y: 0, position: 'relative' })

      labelTl.current = gsap
        .timeline({
          onComplete: () => {
            if (seq !== requestSeq.current) return
            setDisplayId(nextId)
            gsap.set(outEl, { clearProps: 'transform,opacity,position' })
            gsap.set(inEl, {
              clearProps: 'transform,opacity,position',
              opacity: 0,
            })
            inEl.replaceChildren()
          },
        })
        .to(outEl, { opacity: 0, y: -8, duration: 0.3, ease: 'power2.inOut' }, 0)
        .to(inEl, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.inOut' }, 0)
    },
    [displayId, reduced],
  )

  const selectColor = useCallback(
    async (nextId: ExteriorColorId) => {
      setExteriorColor(nextId)

      const seq = ++requestSeq.current
      transitionTl.current?.kill()

      void animateLabel(nextId, seq)

      if (glowRef.current) {
        glowRef.current.style.background = ambientBackground(
          getExteriorColorById(nextId).swatch,
        )
      }

      if (nextId === baseId) return

      try {
        await preloadColorImage(getExteriorColorById(nextId).imageSrc)
      } catch {
        // preload 실패해도 전환 시도
      }
      if (seq !== requestSeq.current) return

      const baseImg = baseImgRef.current
      const nextImg = nextImgRef.current
      const nextMeta = getExteriorColorById(nextId)
      if (!baseImg || !nextImg) {
        setBaseId(nextId)
        return
      }

      if (reduced) {
        baseImg.src = nextMeta.imageSrc
        baseImg.alt = `${nextMeta.name} 외장 컬러 EV3`
        setBaseId(nextId)
        return
      }

      const gsap = (await import('gsap')).default
      if (seq !== requestSeq.current) return

      nextImg.src = nextMeta.imageSrc

      gsap.set(nextImg, { opacity: 0, scale: 1.015, y: 6 })
      gsap.set(baseImg, { opacity: 1, scale: 1, y: 0 })

      transitionTl.current = gsap
        .timeline({
          defaults: { duration: 0.45, ease: 'power2.inOut' },
          onComplete: () => {
            if (seq !== requestSeq.current) return
            baseImg.src = nextMeta.imageSrc
            baseImg.alt = `기아 EV3 ${nextMeta.name} 외장 컬러`
            gsap.set(baseImg, { opacity: 1, scale: 1, y: 0 })
            gsap.set(nextImg, { opacity: 0, scale: 1, y: 0 })
            setBaseId(nextId)
          },
        })
        .to(nextImg, { opacity: 1, scale: 1, y: 0 }, 0)
        .to(baseImg, { opacity: 0, scale: 1, y: 0 }, 0)
    },
    [animateLabel, baseId, reduced, setExteriorColor],
  )

  return (
    <section
      id="color-studio"
      ref={rootRef}
      className="relative overflow-x-hidden bg-silver-mist py-[clamp(3.5rem,7vw,6.5rem)]"
      aria-labelledby="color-studio-title"
    >
      <Container className="min-w-0">
        <header className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <p className="cs-label text-xs font-semibold tracking-[0.2em] text-deep-teal/70 uppercase">
            {COLOR_STUDIO.index} / {COLOR_STUDIO.eyebrow}
          </p>
          <h2
            id="color-studio-title"
            className="cs-title mt-4 text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl"
          >
            {COLOR_STUDIO.title}
          </h2>
          <p className="cs-desc mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
            {COLOR_STUDIO.description}
          </p>
        </header>

        <div className="mx-auto max-w-5xl">
          <div
            className="cs-stage relative w-full overflow-hidden rounded-[4px] bg-[#E8ECEB]"
            style={{ aspectRatio: '1600 / 900' }}
          >
            <div
              ref={glowRef}
              className="pointer-events-none absolute inset-0 transition-[background] duration-[600ms] ease-in-out"
              style={{ background: ambientBackground(selectedColor.swatch) }}
              aria-hidden
            />

            <img
              ref={baseImgRef}
              src={baseColor.imageSrc}
              alt={`기아 EV3 ${baseColor.name} 외장 컬러`}
              width={1600}
              height={900}
              className="absolute inset-0 h-full w-full object-contain object-center will-change-transform"
              decoding="async"
              loading="lazy"
              fetchPriority="low"
              draggable={false}
            />
            <img
              ref={nextImgRef}
              src={baseColor.imageSrc}
              alt=""
              aria-hidden
              width={1600}
              height={900}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center will-change-transform"
              style={{ opacity: 0 }}
              decoding="async"
              loading="lazy"
              fetchPriority="low"
              draggable={false}
            />
          </div>

          <div
            className="cs-meta relative mx-auto mt-8 min-h-[5.5rem] text-center md:mt-10 md:min-h-[5.75rem]"
            aria-live="polite"
          >
            <div ref={labelOutRef}>
              <p className="text-xs font-semibold tracking-[0.16em] text-deep-teal/60 uppercase">
                {displayColor.code}
              </p>
              <p className="mt-2 text-lg font-semibold text-ink md:text-xl">
                {displayColor.name}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{displayColor.nameEn}</p>
            </div>
            <div ref={labelInRef} className="pointer-events-none opacity-0" aria-hidden />
          </div>

          <ul
            className="cs-swatches mx-auto mt-8 flex w-[13.25rem] flex-wrap justify-center gap-3 md:mt-10 md:w-auto md:gap-4"
            role="listbox"
            aria-label="외장 컬러 선택"
            aria-activedescendant={`color-swatch-${exteriorColorId}`}
          >
            {EXTERIOR_COLORS.map((color) => (
              <li key={color.id} role="option" aria-selected={exteriorColorId === color.id}>
                <ColorSwatch
                  color={color}
                  selected={exteriorColorId === color.id}
                  reduced={reduced}
                  onSelect={(id) => {
                    void selectColor(id)
                  }}
                />
              </li>
            ))}
          </ul>

          <p className="sr-only">현재 선택: {selectedColor.name}</p>
        </div>
      </Container>
    </section>
  )
}
