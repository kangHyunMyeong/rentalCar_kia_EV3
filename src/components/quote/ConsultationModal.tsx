import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import {
  CONTRACT_LABELS,
  DEPOSIT_LABELS,
  MILEAGE_LABELS,
  PREPAYMENT_LABELS,
} from '@/data/rental-conditions'
import { MARKETING_CONSENT, PRIVACY_CONSENT } from '@/data/privacy'
import { getRentalTrimById } from '@/data/rental-trims'
import { createLeadService } from '@/services/lead'
import type { EstimateLeadSnapshot, QuoteSelection } from '@/types'

const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, '이름을 입력해 주세요.')
    .max(40, '이름은 40자 이하로 입력해 주세요.'),
  phone: z
    .string()
    .trim()
    .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '휴대전화번호를 확인해 주세요. 예: 010-1234-5678'),
  privacyConsent: z.boolean().refine((v) => v === true, {
    message: '개인정보 수집 및 이용에 동의해 주세요.',
  }),
  marketingConsent: z.boolean(),
})

type LeadFormValues = z.infer<typeof leadSchema>

interface ConsultationModalProps {
  open: boolean
  selection: QuoteSelection
  estimateSnapshot: EstimateLeadSnapshot
  onClose: () => void
}

export function ConsultationModal({
  open,
  selection,
  estimateSnapshot,
  onClose,
}: ConsultationModalProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const leadService = createLeadService()
  const trim = getRentalTrimById(selection.trimId)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      phone: '',
      privacyConsent: false,
      marketingConsent: false,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: LeadFormValues) =>
      leadService.submitLead({
        name: values.name,
        phone: values.phone,
        privacyConsent: true,
        marketingConsent: values.marketingConsent,
        quoteSelection: selection,
        estimateSnapshot,
        source: 'landing-ev3',
      }),
    onSuccess: () => {
      reset({
        name: '',
        phone: '',
        privacyConsent: false,
        marketingConsent: false,
      })
    },
  })

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    mutation.reset()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      previouslyFocused.current?.focus()
    }
    // mutation.reset intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose])

  if (!open) return null

  const onSubmit = handleSubmit(async (values) => {
    if (mutation.isPending) return
    await mutation.mutateAsync(values)
  })

  const displayFee =
    estimateSnapshot.roundedMonthlyRent ?? estimateSnapshot.estimatedMonthlyFee
  const feeLabel =
    displayFee != null
      ? `약 ${new Intl.NumberFormat('ko-KR').format(displayFee)}원 / 월`
      : estimateSnapshot.estimateStatus === 'consultation_required'
        ? '상담 후 확인'
        : '견적 데이터 확인 필요'

  const feeSuffix =
    estimateSnapshot.estimateStatus === 'public_reference' ||
    estimateSnapshot.estimateStatus === 'simulation_assumption'
      ? ' (시뮬레이션)'
      : ''

  const summaryRows = [
    { label: '트림', value: trim?.name ?? selection.trimId },
    { label: '선납금', value: PREPAYMENT_LABELS[selection.prepaymentPercent] },
    { label: '보증금', value: DEPOSIT_LABELS[selection.depositPercent] },
    { label: '연간 주행거리', value: MILEAGE_LABELS[selection.annualMileage] },
    { label: '계약기간', value: CONTRACT_LABELS[selection.contractMonths] },
    {
      label: '월 예상 렌트료',
      value: `${feeLabel}${feeSuffix}`,
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0f1a1a]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[92svh] w-full overflow-y-auto rounded-t-[20px] bg-[#F7F9F8] sm:max-w-lg sm:rounded-[20px]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E2E0DB] bg-[#F7F9F8] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-[#171B1B]">
              EV3 맞춤 견적 상담 신청
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#6B7474]">
              선택하신 조건을 바탕으로 담당자가 맞춤 견적을 안내해드립니다.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="shrink-0 rounded-lg px-3 py-2 text-sm text-[#6B7474] hover:bg-[#E8ECEB]"
            onClick={onClose}
            aria-label="모달 닫기"
          >
            닫기
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            시연 모드: 상담 신청 API가 연결되지 않았습니다. 제출해도 실제 접수는 이루어지지 않으며,
            개인정보는 localStorage에 저장되지 않습니다.
          </div>

          <div className="rounded-[14px] border border-[#E2E0DB] bg-white p-4">
            <p className="text-sm font-medium text-deep-teal">선택한 견적 조건</p>
            <dl className="mt-3 space-y-2">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-[#6B7474]">{row.label}</dt>
                  <dd className="font-medium text-[#171B1B]">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="modal-name" className="mb-2 block text-sm font-medium text-[#171B1B]">
                이름 <span className="text-[#9B2C2C]">*</span>
              </label>
              <input
                id="modal-name"
                autoComplete="name"
                className="min-h-12 w-full rounded-[12px] border border-[#E2E0DB] bg-white px-4"
                {...register('name')}
              />
              {errors.name ? (
                <p className="mt-1.5 text-sm text-[#9B2C2C]" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="modal-phone" className="mb-2 block text-sm font-medium text-[#171B1B]">
                휴대전화번호 <span className="text-[#9B2C2C]">*</span>
              </label>
              <input
                id="modal-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="010-1234-5678"
                className="min-h-12 w-full rounded-[12px] border border-[#E2E0DB] bg-white px-4"
                {...register('phone')}
              />
              {errors.phone ? (
                <p className="mt-1.5 text-sm text-[#9B2C2C]" role="alert">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-[14px] bg-[#ECEFEE] p-4">
              <label className="flex items-start gap-3 text-sm text-[#171B1B]">
                <input type="checkbox" className="mt-1 h-4 w-4" {...register('privacyConsent')} />
                <span>
                  <strong className="font-semibold">[필수]</strong> {PRIVACY_CONSENT.summary}{' '}
                  <button
                    type="button"
                    className="text-deep-teal underline underline-offset-2"
                    onClick={() => setPrivacyOpen((v) => !v)}
                  >
                    {privacyOpen ? '접기' : '상세 보기'}
                  </button>
                </span>
              </label>
              {privacyOpen ? (
                <ul className="ml-7 list-disc space-y-1 text-xs leading-relaxed text-[#6B7474]">
                  {PRIVACY_CONSENT.details.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {errors.privacyConsent ? (
                <p className="text-sm text-[#9B2C2C]" role="alert">
                  {errors.privacyConsent.message}
                </p>
              ) : null}

              <label className="flex items-start gap-3 text-sm text-[#171B1B]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  {...register('marketingConsent')}
                />
                <span>
                  <strong className="font-semibold">[선택]</strong> {MARKETING_CONSENT.summary}
                </span>
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={mutation.isPending}
              arrow
            >
              {mutation.isPending ? '제출 중…' : '상담 신청하기'}
            </Button>

            <div aria-live="polite" className="min-h-6 text-sm">
              {mutation.isError ? (
                <p className="text-[#9B2C2C]">제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
              ) : null}
              {mutation.isSuccess ? (
                <p className="text-deep-teal">{mutation.data.message}</p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
