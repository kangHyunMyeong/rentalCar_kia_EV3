import { useEffect, useRef, useState } from 'react'
import { VehicleImage } from '@/components/ui/VehicleImage'
import { EV3_IMAGE_PATHS } from '@/data/images'
import {
  CONTRACT_LABELS,
  DEPOSIT_LABELS,
  MILEAGE_LABELS,
  PREPAYMENT_LABELS,
} from '@/data/rental-conditions'
import { getRentalTrimById } from '@/data/rental-trims'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { RentalEstimateResult } from '@/services/pricing'
import type { QuoteSelection } from '@/types'

interface EstimateSummaryProps {
  selection: QuoteSelection
  estimate: RentalEstimateResult
  onConsult: () => void
}

function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

export function EstimateSummary({ selection, estimate, onConsult }: EstimateSummaryProps) {
  const trim = getRentalTrimById(selection.trimId)
  const reduced = usePrefersReducedMotion()
  const amountRef = useRef<HTMLParagraphElement>(null)
  const targetAmount = estimate.ok ? estimate.monthlyEstimate : null
  const [displayAmount, setDisplayAmount] = useState<number | null>(targetAmount)
  const displayedRef = useRef<number | null>(targetAmount)

  const rows = [
    { label: '트림', value: trim?.name ?? selection.trimId },
    { label: '선납금', value: PREPAYMENT_LABELS[selection.prepaymentPercent] },
    { label: '보증금', value: DEPOSIT_LABELS[selection.depositPercent] },
    { label: '연간 주행거리', value: MILEAGE_LABELS[selection.annualMileage] },
    { label: '계약기간', value: CONTRACT_LABELS[selection.contractMonths] },
  ]

  useEffect(() => {
    if (targetAmount === displayedRef.current) return

    if (reduced || targetAmount === null || displayedRef.current === null) {
      displayedRef.current = targetAmount
      setDisplayAmount(targetAmount)
      return
    }

    let cancelled = false
    const next = targetAmount

    void (async () => {
      const el = amountRef.current
      if (!el) {
        if (!cancelled) {
          displayedRef.current = next
          setDisplayAmount(next)
        }
        return
      }

      const gsap = (await import('gsap')).default
      if (cancelled) return

      await gsap.to(el, {
        opacity: 0,
        y: -6,
        duration: 0.12,
        ease: 'power1.in',
      })

      if (cancelled) return
      displayedRef.current = next
      setDisplayAmount(next)

      await gsap.fromTo(
        el,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' },
      )
    })()

    return () => {
      cancelled = true
    }
  }, [targetAmount, reduced])

  const showAmount =
    estimate.ok && displayAmount != null && Number.isFinite(displayAmount) && displayAmount >= 0
  const showReferenceNotice =
    estimate.ok &&
    (estimate.meta.estimateStatus === 'public_reference' ||
      estimate.meta.estimateStatus === 'simulation_assumption')

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] bg-deep-teal text-white">
      <div className="border-b border-white/10 px-5 pt-5 md:px-6 md:pt-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-soft-mint/80 uppercase md:text-sm">
          MY EV3
        </p>
        <div className="mx-auto mt-3 max-w-[260px]">
          <VehicleImage
            src={EV3_IMAGE_PATHS.kvCar}
            alt="기아 EV3 전면 3/4 컷아웃"
            mode="cutout"
            className="mx-auto"
            imgClassName="mx-auto max-h-36 w-auto object-contain md:max-h-40"
            fallbackLabel="EV3 컷아웃 이미지"
          />
          <p className="mt-1.5 pb-1 text-center text-[11px] text-white/45">
            대표 이미지 · 트림별 실제 외관과 다를 수 있습니다
          </p>
        </div>
      </div>

      <dl className="flex flex-1 flex-col justify-center px-5 py-1 md:px-6">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-4 border-b border-white/10 py-3 text-[0.98rem] last:border-b-0 md:py-3.5 md:text-base"
          >
            <dt className="text-white/55">{row.label}</dt>
            <dd className="text-right font-medium text-[#F4F1EC]">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-white/10 px-5 py-4 md:px-6 md:py-5" aria-live="polite">
        <p className="text-xs tracking-[0.14em] text-soft-mint/70 uppercase md:text-sm">
          월 예상 렌트료
        </p>

        {showAmount ? (
          <>
            <p
              ref={amountRef}
              className="mt-1.5 font-semibold tracking-tight text-white"
              style={{ fontSize: 'clamp(1.75rem, 2.6vw, 2.25rem)', lineHeight: 1.2 }}
            >
              약 {formatKRW(displayAmount)}
              <span className="ml-1.5 text-[0.48em] font-medium text-white/85">원 / 월</span>
            </p>
            {showReferenceNotice ? (
              <p className="mt-2.5 text-xs leading-relaxed text-white/45 md:text-[13px]">
                표시된 금액은 공개된 참고 견적과 선택하신 계약 조건을 바탕으로 산출한 예상
                금액입니다. 실제 렌트료는 렌트사별 요율, 보험 조건 및 프로모션 등에 따라 달라질 수
                있습니다.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-[#F4F1EC] md:text-2xl">
            {estimate.ok ? '견적 데이터 확인 필요' : estimate.message}
          </p>
        )}

        <button
          type="button"
          onClick={onConsult}
          className="group mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#F4F1EC] px-5 text-base font-semibold text-deep-teal transition-colors duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-soft-mint"
        >
          <span>맞춤 견적 상담 신청하기</span>
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
      </div>
    </aside>
  )
}
