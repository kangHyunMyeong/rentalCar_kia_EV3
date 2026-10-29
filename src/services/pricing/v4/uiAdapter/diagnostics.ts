import { V4_SUSPICIOUSLY_LOW_MONTHLY } from '../config'
import type { V4EstimateResult, V4RentalEstimate } from '../types'
import type { V4UiDiagnostic, V4UiDiagnosticCode } from './types'

function diag(
  code: V4UiDiagnosticCode,
  message: string,
): V4UiDiagnostic {
  return { code, message, displayDeferred: true }
}

/**
 * V4 결과를 진단한다. 월액을 임의 보정하지 않음.
 * requiresReview 운영 표시 여부는 후속 승인 단계에서 결정.
 */
export function diagnoseV4Estimate(
  result: V4EstimateResult,
): {
  requiresReview: boolean
  diagnostics: V4UiDiagnostic[]
  warnings: string[]
} {
  const diagnostics: V4UiDiagnostic[] = []
  const warnings: string[] = []

  if (!result.ok) {
    if (result.code === 'UNLIMITED_MILEAGE_CONSULTATION') {
      diagnostics.push(
        diag('unlimited_mileage', '무제한 주행 — 수치 시뮬레이션 미지원'),
      )
    } else if (result.code === 'INVALID_OPTIONS') {
      diagnostics.push(diag('invalid_options', result.message))
    } else if (result.code === 'INVALID_RESULT') {
      diagnostics.push(diag('invalid_numeric_result', result.message))
    } else {
      diagnostics.push(diag('calculation_failed', result.message))
    }
    warnings.push(...result.warnings)
    return { requiresReview: true, diagnostics, warnings }
  }

  return diagnoseSuccessfulEstimate(result.estimate)
}

export function diagnoseSuccessfulEstimate(estimate: V4RentalEstimate): {
  requiresReview: boolean
  diagnostics: V4UiDiagnostic[]
  warnings: string[]
} {
  const diagnostics: V4UiDiagnostic[] = []
  const warnings = [...estimate.warnings]

  if (!Number.isFinite(estimate.monthlyRental) || !Number.isFinite(estimate.rawMonthlyRental)) {
    diagnostics.push(diag('invalid_numeric_result', '월 렌트료가 유한 숫자가 아님'))
  }

  if (estimate.financedCapital < estimate.residualValue) {
    diagnostics.push(
      diag(
        'financed_capital_below_residual',
        `금융 대상 자본(${Math.round(estimate.financedCapital)}) < 잔존가치(${Math.round(estimate.residualValue)})`,
      ),
    )
  }

  if (estimate.monthlyDepreciation < 0) {
    diagnostics.push(
      diag(
        'negative_depreciation',
        `음수 감가상각=${estimate.monthlyDepreciation} — 임의 0원 보정 없음`,
      ),
    )
  }

  if (estimate.rawMonthlyRental < 0 || estimate.monthlyRental < 0) {
    diagnostics.push(
      diag(
        'negative_monthly_rent',
        `음수 월액 raw=${estimate.rawMonthlyRental} — 하한 보정 없음`,
      ),
    )
  }

  if (estimate.monthlyRental < V4_SUSPICIOUSLY_LOW_MONTHLY) {
    diagnostics.push(
      diag(
        'suspiciously_low_monthly',
        `월액 ${estimate.monthlyRental} < 임계 ${V4_SUSPICIOUSLY_LOW_MONTHLY}`,
      ),
    )
  }

  if (estimate.estimateStatus === 'needs_verification') {
    diagnostics.push(
      diag('needs_verification_flag', 'V4 estimateStatus=needs_verification'),
    )
  }

  const requiresReview =
    diagnostics.length > 0 || estimate.estimateStatus === 'needs_verification'

  return { requiresReview, diagnostics, warnings }
}

/** 입력 스냅샷 — 리뷰용 기록 (민감 정보 없음) */
export function buildReviewInputSnapshot(estimate: V4RentalEstimate): Record<string, number | string> {
  return {
    trim: estimate.selectedTrim,
    contractMonths: estimate.contractMonths,
    annualMileage: String(estimate.annualMileage),
    calculationVehiclePrice: estimate.calculationVehiclePrice,
    prepaymentAmount: estimate.prepaymentAmount,
    depositAmount: estimate.depositAmount,
    financedCapital: estimate.financedCapital,
    residualValue: estimate.residualValue,
    residualRate: estimate.residualRate,
    monthlyDepreciation: estimate.monthlyDepreciation,
    monthlyFinance: estimate.monthlyFinance,
    monthlyRental: estimate.monthlyRental,
  }
}
