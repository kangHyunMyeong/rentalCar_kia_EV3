import { useVehicleImage } from '@/hooks/useVehicleImage'
import type { CarImageMode } from '@/data/images'

interface VehicleImageProps {
  src: string
  mobileSrc?: string
  alt: string
  className?: string
  imgClassName?: string
  priority?: boolean
  mode?: CarImageMode
  fallbackLabel?: string
}

/**
 * cutout: 배경 제거 차량 → 투명/그라디언트 위 배치
 * studio: 배경 포함 차량 → 이미지 자체가 장면
 * 이미지 파일만 교체하면 컴포넌트/CSS 수정 없이 반영됩니다.
 */
export function VehicleImage({
  src,
  mobileSrc,
  alt,
  className = '',
  imgClassName = '',
  priority = false,
  mode = 'cutout',
  fallbackLabel = 'EV3 이미지 준비 중',
}: VehicleImageProps) {
  const image = useVehicleImage(src)

  return (
    <div
      className={[
        'relative',
        mode === 'cutout' ? 'overflow-visible bg-transparent' : 'overflow-hidden bg-sculpted-gray/30',
        className,
      ].join(' ')}
      data-car-mode={mode}
    >
      {!image.failed && image.src ? (
        <picture className="contents">
          {mobileSrc ? (
            <source media="(max-width: 767px)" srcSet={mobileSrc} type="image/webp" />
          ) : null}
          <img
            src={image.src}
            alt={alt}
            width={1600}
            height={900}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : 'auto'}
            onError={image.onError}
            onLoad={image.onLoad}
            className={['h-auto max-w-full object-contain', imgClassName].join(' ')}
          />
        </picture>
      ) : (
        <div
          className="car-fallback flex aspect-[16/9] w-full items-center justify-center rounded-[18px]"
          role="img"
          aria-label={alt}
        >
          <div className="text-center px-4">
            <p className="text-sm font-medium tracking-wide text-deep-teal/70">{fallbackLabel}</p>
            <p className="mt-1 text-xs text-ink-muted">public/assets/ev3 경로의 이미지를 교체하세요</p>
          </div>
        </div>
      )}
    </div>
  )
}
