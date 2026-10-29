import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getRentalTrimById } from '@/data/rental-trims'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { scrollToSection } from '@/hooks/useSmoothScroll'
import { getActivePricingMode, resolveRentalEstimate } from '@/services/pricing'
import { useQuoteStore } from '@/stores/quoteStore'

function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

/**
 * KV를 지나면 노출, 마지막 상담 CTA·푸터·상담 모달에서는 숨김.
 * 섹션 IntersectionObserver 기준으로 제어 (고정 px 스크롤 미사용).
 */
function useFloatingBarVisible(modalOpen: boolean): boolean {
  const [pastHero, setPastHero] = useState(false)
  const [inEndZone, setInEndZone] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('top')
    const closing = document.getElementById('consultation-cta')
    const footer = document.getElementById('site-footer')

    const endVisible = new Map<Element, boolean>()

    const syncEndZone = () => {
      let any = false
      endVisible.forEach((v) => {
        if (v) any = true
      })
      setInEndZone(any)
    }

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        // 고정 헤더 아래로 KV가 지나면 노출 (헤더에 가린 잔여 픽셀은 무시)
        const headerRaw = getComputedStyle(document.documentElement)
          .getPropertyValue('--header-h')
          .trim()
        const headerH = Number.parseFloat(headerRaw) || 78
        setPastHero(entry.boundingClientRect.bottom <= headerH + 24)
      },
      { threshold: [0, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1] },
    )

    const endObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // 소량만 보여도 종료 구간으로 간주해 깜빡임 완화
          endVisible.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= 0.06)
        }
        syncEndZone()
      },
      { threshold: [0, 0.06, 0.15, 0.3], rootMargin: '0px 0px -12% 0px' },
    )

    if (hero) heroObserver.observe(hero)
    if (closing) endObserver.observe(closing)
    if (footer) endObserver.observe(footer)

    return () => {
      heroObserver.disconnect()
      endObserver.disconnect()
    }
  }, [])

  return pastHero && !inEndZone && !modalOpen
}

export function FloatingEstimateBar() {
  const reduced = usePrefersReducedMotion()
  const trimId = useQuoteStore((s) => s.trimId)
  const exteriorColorId = useQuoteStore((s) => s.exteriorColorId)
  const prepaymentPercent = useQuoteStore((s) => s.prepaymentPercent)
  const depositPercent = useQuoteStore((s) => s.depositPercent)
  const annualMileage = useQuoteStore((s) => s.annualMileage)
  const contractMonths = useQuoteStore((s) => s.contractMonths)
  const modalOpen = useQuoteStore((s) => s.consultationModalOpen)
  const openConsultationModal = useQuoteStore((s) => s.openConsultationModal)

  const visible = useFloatingBarVisible(modalOpen)

  const selection = useMemo(
    () => ({
      trimId,
      prepaymentPercent,
      depositPercent,
      annualMileage,
      contractMonths,
      exteriorColorId,
    }),
    [
      trimId,
      prepaymentPercent,
      depositPercent,
      annualMileage,
      contractMonths,
      exteriorColorId,
    ],
  )

  const estimate = useMemo(
    () => resolveRentalEstimate(selection, getActivePricingMode()),
    [selection],
  )

  const trimName = getRentalTrimById(trimId)?.name ?? trimId

  const showAmount =
    estimate.ok &&
    Number.isFinite(estimate.monthlyEstimate) &&
    estimate.monthlyEstimate >= 0

  const amountText = showAmount
    ? `약 ${formatKRW(estimate.monthlyEstimate)}원/월`
    : '상담 후 안내'
  const amountTextMobile = showAmount
    ? `${formatKRW(estimate.monthlyEstimate)}원`
    : '상담 후 안내'

  useEffect(() => {
    const root = document.documentElement
    if (visible) {
      root.classList.add('has-floating-bar')
    } else {
      root.classList.remove('has-floating-bar')
    }
    return () => root.classList.remove('has-floating-bar')
  }, [visible])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={[
        'floating-estimate-bar',
        visible ? 'is-visible' : 'is-hidden',
        reduced ? 'is-reduced-motion' : '',
      ].join(' ')}
      aria-hidden={!visible}
      inert={!visible ? true : undefined}
    >
      <div className="floating-estimate-bar__inner">
        <button
          type="button"
          className="floating-estimate-bar__info"
          onClick={() => scrollToSection('quote')}
          tabIndex={visible ? 0 : -1}
          aria-label={`장기렌트 견적으로 이동. ${trimName}, ${amountText}`}
        >
          <span className="floating-estimate-bar__label">예상 렌트료</span>
          <span className="floating-estimate-bar__trim">{trimName}</span>
          <span className="floating-estimate-bar__amount" aria-live="off">
            <span className="floating-estimate-bar__amount-desktop">{amountText}</span>
            <span className="floating-estimate-bar__amount-mobile">
              <span className="floating-estimate-bar__label-mobile">월 예상 렌트료</span>
              <span className="floating-estimate-bar__amount-value">{amountTextMobile}</span>
            </span>
          </span>
        </button>

        <button
          type="button"
          className="floating-estimate-bar__cta group"
          onClick={openConsultationModal}
          tabIndex={visible ? 0 : -1}
          aria-label="견적 상담 신청"
        >
          <span className="floating-estimate-bar__cta-full">견적 상담 신청</span>
          <span className="floating-estimate-bar__cta-short" aria-hidden>
            견적 상담
          </span>
          <span
            aria-hidden
            className="transition-transform duration-[220ms] group-hover:translate-x-0.5"
          >
            ↗
          </span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
