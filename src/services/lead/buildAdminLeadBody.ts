import {
  CONTRACT_LABELS,
  DEPOSIT_LABELS,
  MILEAGE_LABELS,
  PREPAYMENT_LABELS,
} from '@/data/rental-conditions'
import { getExteriorColorById } from '@/data/colors'
import { getRentalTrimById } from '@/data/rental-trims'
import type { LeadRequest } from '@/types'
import { ADMIN_LEAD_SITE_ID } from './adminLeadConfig'

export interface AdminLeadSelection {
  key: string
  label: string
  value: string
}

export interface AdminLeadContext {
  device: 'mobile' | 'desktop'
  path: string
  url: string
  referrer: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  landing_slug?: string
  source?: string
}

export interface AdminLeadBody {
  site_id: string
  name: string
  phone: string
  email?: string
  message?: string
  payload: {
    selections: AdminLeadSelection[]
    context: AdminLeadContext
  }
}

function readUtm(params: URLSearchParams, key: string): string | undefined {
  const v = params.get(key)?.trim()
  return v || undefined
}

export function buildLeadContext(
  source: string,
  landingSlug: string,
): AdminLeadContext {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()

  const isMobile =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 767px)').matches

  return {
    device: isMobile ? 'mobile' : 'desktop',
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    url: typeof window !== 'undefined' ? window.location.href : '',
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    utm_source: readUtm(params, 'utm_source'),
    utm_medium: readUtm(params, 'utm_medium'),
    utm_campaign: readUtm(params, 'utm_campaign'),
    landing_slug: landingSlug,
    source,
  }
}

export function buildLeadSelections(request: LeadRequest): AdminLeadSelection[] {
  const { quoteSelection: s, estimateSnapshot, marketingConsent } = request
  const trim = getRentalTrimById(s.trimId)
  const color = s.exteriorColorId
    ? getExteriorColorById(s.exteriorColorId)
    : undefined

  const fee =
    estimateSnapshot?.roundedMonthlyRent ?? estimateSnapshot?.estimatedMonthlyFee
  const feeValue =
    fee != null
      ? `약 ${new Intl.NumberFormat('ko-KR').format(fee)}원/월`
      : estimateSnapshot?.estimateStatus === 'consultation_required'
        ? '상담 후 확인'
        : '견적 확인 필요'

  const selections: AdminLeadSelection[] = [
    {
      key: 'trim',
      label: '트림',
      value: trim?.name ?? s.trimId,
    },
    {
      key: 'prepayment',
      label: '선납금',
      value: PREPAYMENT_LABELS[s.prepaymentPercent],
    },
    {
      key: 'deposit',
      label: '보증금',
      value: DEPOSIT_LABELS[s.depositPercent],
    },
    {
      key: 'annual_mileage',
      label: '연간 주행거리',
      value: MILEAGE_LABELS[s.annualMileage],
    },
    {
      key: 'contract_months',
      label: '계약기간',
      value: CONTRACT_LABELS[s.contractMonths],
    },
    {
      key: 'monthly_estimate',
      label: '월 예상 렌트료',
      value: feeValue,
    },
    {
      key: 'marketing_consent',
      label: '마케팅 수신 동의',
      value: marketingConsent ? '동의' : '미동의',
    },
  ]

  if (color) {
    selections.splice(1, 0, {
      key: 'exterior_color',
      label: '외장 컬러',
      value: color.name,
    })
  }

  if (estimateSnapshot?.estimateStatus) {
    selections.push({
      key: 'estimate_status',
      label: '견적 상태',
      value: estimateSnapshot.estimateStatus,
    })
  }

  return selections
}

export function buildAdminLeadBody(
  request: LeadRequest,
  options?: { landingSlug?: string },
): AdminLeadBody {
  const trim = getRentalTrimById(request.quoteSelection.trimId)
  const selections = buildLeadSelections(request)
  const landingSlug = options?.landingSlug ?? 'ev3'
  const summary = selections
    .filter((row) =>
      ['trim', 'contract_months', 'monthly_estimate'].includes(row.key),
    )
    .map((row) => `${row.label}: ${row.value}`)
    .join(' / ')

  const body: AdminLeadBody = {
    site_id: ADMIN_LEAD_SITE_ID,
    name: request.name.trim(),
    phone: request.phone.trim(),
    message:
      request.memo?.trim() ||
      `EV3 장기렌트 상담 신청 (${trim?.name ?? request.quoteSelection.trimId}) — ${summary}`,
    payload: {
      selections,
      context: buildLeadContext(request.source, landingSlug),
    },
  }

  return body
}
