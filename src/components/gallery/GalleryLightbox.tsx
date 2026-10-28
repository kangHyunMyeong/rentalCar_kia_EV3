import { useEffect, useId, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, A11y, Keyboard } from 'swiper/modules'
import type { GallerySlide } from '@/types'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

interface GalleryLightboxProps {
  open: boolean
  label: string
  slides: GallerySlide[]
  initialIndex?: number
  onClose: () => void
}

export function GalleryLightbox({
  open,
  label,
  slides,
  initialIndex = 0,
  onClose,
}: GalleryLightboxProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0f1a1a]/72 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-5xl rounded-[18px] bg-[#F7F9F8] p-4 pt-12 shadow-none md:p-6 md:pt-14">
        <div className="absolute inset-x-4 top-4 flex items-center justify-between md:inset-x-6">
          <p id={titleId} className="text-xs font-semibold tracking-[0.18em] text-deep-teal/70 uppercase">
            {label}
          </p>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm text-ink hover:bg-sculpted-gray/30"
            onClick={onClose}
            aria-label="갤러리 닫기"
          >
            닫기
          </button>
        </div>

        <div className="design-lightbox-swiper">
          <Swiper
            key={`${label}-${initialIndex}`}
            modules={[Navigation, Pagination, A11y, Keyboard]}
            initialSlide={initialIndex}
            spaceBetween={12}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            keyboard={{ enabled: true }}
            a11y={{
              enabled: true,
              prevSlideMessage: '이전 이미지',
              nextSlideMessage: '다음 이미지',
            }}
            className="!pb-10"
          >
            {slides.map((slide) => (
              <SwiperSlide key={slide.id}>
                <figure className="min-w-0">
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    width={1600}
                    height={1067}
                    className="mx-auto max-h-[min(70svh,720px)] w-auto max-w-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="mt-4 text-center text-sm text-ink-muted">
                    {slide.caption}
                  </figcaption>
                </figure>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  )
}
