import { useEffect, useMemo, useRef } from 'react'
import { Container } from '@/components/ui/Container'
import {
  CONTRACT_LABELS,
  CONTRACT_SUB_LABELS,
  DEPOSIT_LABELS,
  MILEAGE_LABELS,
  PREPAYMENT_LABELS,
  RENTAL_CONDITIONS,
} from '@/data/rental-conditions'
import { RENTAL_TRIMS } from '@/data/rental-trims'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  getActivePricingMode,
  resolveRentalEstimate,
  toEstimateLeadSnapshot,
} from '@/services/pricing'
import { useQuoteStore } from '@/stores/quoteStore'
import type {
  AnnualMileage,
  ContractMonths,
  DepositPercent,
  PrepaymentPercent,
  TrimId,
} from '@/types'
import { ConsultationModal } from './ConsultationModal'
import { EstimateSummary } from './EstimateSummary'
import { SegmentedControl } from './SegmentedControl'

export function RentalEstimateSection() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  const trimId = useQuoteStore((s) => s.trimId)
  const prepaymentPercent = useQuoteStore((s) => s.prepaymentPercent)
  const depositPercent = useQuoteStore((s) => s.depositPercent)
  const annualMileage = useQuoteStore((s) => s.annualMileage)
  const contractMonths = useQuoteStore((s) => s.contractMonths)
  const modalOpen = useQuoteStore((s) => s.consultationModalOpen)
  const setTrim = useQuoteStore((s) => s.setTrim)
  const setPrepaymentPercent = useQuoteStore((s) => s.setPrepaymentPercent)
  const setDepositPercent = useQuoteStore((s) => s.setDepositPercent)
  const setAnnualMileage = useQuoteStore((s) => s.setAnnualMileage)
  const setContractMonths = useQuoteStore((s) => s.setContractMonths)
  const openConsultationModal = useQuoteStore((s) => s.openConsultationModal)
  const closeConsultationModal = useQuoteStore((s) => s.closeConsultationModal)

  const selection = useMemo(
    () => ({
      trimId,
      prepaymentPercent,
      depositPercent,
      annualMileage,
      contractMonths,
    }),
    [trimId, prepaymentPercent, depositPercent, annualMileage, contractMonths],
  )

  const pricingMode = getActivePricingMode()
  const estimate = useMemo(
    () => resolveRentalEstimate(selection, pricingMode),
    [selection, pricingMode],
  )
  const estimateSnapshot = useMemo(
    () => toEstimateLeadSnapshot(selection, estimate),
    [selection, estimate],
  )

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
          '.re-fade',
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 75%',
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
      id="quote"
      ref={rootRef}
      className="relative overflow-x-hidden bg-[#F4F3F0] py-[clamp(4rem,8vw,7rem)]"
      aria-labelledby="rental-estimate-title"
    >
      <Container className="min-w-0 max-w-[1440px]">
        <header className="re-fade mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="text-xs font-semibold tracking-[0.22em] text-deep-teal/70 uppercase">
            05 / RENTAL ESTIMATE
          </p>
          <h2
            id="rental-estimate-title"
            className="mt-4 text-balance text-3xl font-semibold tracking-tight text-[#171B1B] md:text-4xl"
          >
            내 조건에 맞는 EV3 견적.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#6B7474] md:text-lg">
            원하는 계약 조건을 선택하고
            <br className="sm:hidden" /> 맞춤 상담을 신청하세요.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
          <div className="re-fade flex h-full min-h-0 flex-col rounded-[18px] border border-[#E2E0DB] bg-white p-5 md:p-6 lg:p-7">
            <h3 className="text-[1.35rem] font-semibold tracking-tight text-[#171B1B] md:text-[1.45rem]">
              렌트 조건 설정
            </h3>
            <p className="mt-1.5 text-[0.98rem] leading-relaxed text-[#6B7474] md:text-base">
              트림과 계약 조건을 선택하면 오른쪽 요약에 바로 반영됩니다.
            </p>

            <div className="mt-5 flex flex-1 flex-col justify-between gap-5 md:mt-6 md:gap-6 lg:gap-7">
              <fieldset>
                <legend className="mb-2.5 text-[1.05rem] font-medium text-[#171B1B]">트림</legend>
                <label className="sr-only" htmlFor="rental-trim-select">
                  트림 선택
                </label>
                <select
                  id="rental-trim-select"
                  className="min-h-[3.25rem] w-full rounded-[12px] border border-[#E2E0DB] bg-[#F7F6F3] px-4 text-[1.05rem] text-[#171B1B]"
                  value={trimId}
                  onChange={(e) => setTrim(e.target.value as TrimId)}
                >
                  {RENTAL_TRIMS.map((trim) => (
                    <option key={trim.id} value={trim.id} disabled={!trim.available}>
                      {trim.name}
                    </option>
                  ))}
                </select>
              </fieldset>

              <SegmentedControl
                legend="선납금"
                tooltip={{
                  label: '선납금',
                  content:
                    '계약 초기에 납부하여 월 렌트료 산정에 반영되는 금액입니다. 높을수록 월 납입 부담이 줄어들 수 있습니다.',
                }}
                field="prepaymentPercent"
                value={prepaymentPercent}
                selection={selection}
                onChange={(v) => setPrepaymentPercent(v as PrepaymentPercent)}
                options={RENTAL_CONDITIONS.prepaymentPercents.map((rate) => ({
                  value: rate,
                  label: PREPAYMENT_LABELS[rate],
                  badge:
                    rate === RENTAL_CONDITIONS.recommended?.prepaymentPercent
                      ? '권장형'
                      : undefined,
                }))}
              />

              <SegmentedControl
                legend="보증금"
                tooltip={{
                  label: '보증금',
                  content:
                    '계약 이행을 담보하기 위해 예치하는 금액으로, 계약 종료 시 조건에 따라 반환됩니다. 선납금과 성격이 다릅니다.',
                }}
                field="depositPercent"
                value={depositPercent}
                selection={selection}
                onChange={(v) => setDepositPercent(v as DepositPercent)}
                options={RENTAL_CONDITIONS.depositPercents.map((rate) => ({
                  value: rate,
                  label: DEPOSIT_LABELS[rate],
                }))}
              />

              <SegmentedControl
                legend="연간 주행거리"
                field="annualMileage"
                value={annualMileage}
                selection={selection}
                onChange={(v) => setAnnualMileage(v as AnnualMileage)}
                options={RENTAL_CONDITIONS.annualMileages.map((m) => ({
                  value: m,
                  label: MILEAGE_LABELS[m],
                }))}
              />

              <SegmentedControl
                legend="계약기간"
                field="contractMonths"
                value={contractMonths}
                selection={selection}
                onChange={(v) => setContractMonths(v as ContractMonths)}
                options={RENTAL_CONDITIONS.contractMonths.map((m) => ({
                  value: m,
                  label: CONTRACT_LABELS[m],
                  subLabel: CONTRACT_SUB_LABELS[m],
                  badge: m === 60 ? '장기 이용' : undefined,
                }))}
              />
            </div>
          </div>

          <div className="re-fade hidden h-full min-h-0 lg:block">
            <EstimateSummary
              selection={selection}
              estimate={estimate}
              onConsult={openConsultationModal}
            />
          </div>

          {/* 모바일·태블릿: 옵션 아래 요약 */}
          <div className="re-fade lg:hidden">
            <EstimateSummary
              selection={selection}
              estimate={estimate}
              onConsult={openConsultationModal}
            />
          </div>
        </div>
      </Container>

      <ConsultationModal
        open={modalOpen}
        selection={selection}
        estimateSnapshot={estimateSnapshot}
        onClose={closeConsultationModal}
      />
    </section>
  )
}
