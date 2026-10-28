import { create } from 'zustand'
import { DEFAULT_EXTERIOR_COLOR_ID } from '@/data/colors'
import { DEFAULT_QUOTE_SELECTION, RENTAL_CONDITIONS } from '@/data/rental-conditions'
import type {
  AnnualMileage,
  ContractMonths,
  DepositPercent,
  ExteriorColorId,
  PrepaymentPercent,
  QuoteSelection,
  TrimId,
} from '@/types'

interface QuoteState extends QuoteSelection {
  /** Color Studio 전용 — 견적/상담 페이로드에 포함하지 않음 */
  exteriorColorId: ExteriorColorId
  consultationModalOpen: boolean
  setTrim: (trimId: TrimId) => void
  setExteriorColor: (exteriorColorId: ExteriorColorId) => void
  setPrepaymentPercent: (rate: PrepaymentPercent) => void
  setDepositPercent: (rate: DepositPercent) => void
  setAnnualMileage: (mileage: AnnualMileage) => void
  setContractMonths: (months: ContractMonths) => void
  patchSelection: (partial: Partial<QuoteSelection>) => void
  openConsultationModal: () => void
  closeConsultationModal: () => void
  getSelection: () => QuoteSelection
}

function isCombinationDisabled(selection: Partial<QuoteSelection>): boolean {
  return RENTAL_CONDITIONS.disabledCombinations.some((rule) =>
    Object.entries(rule.when).every(([key, value]) => {
      const current = selection[key as keyof QuoteSelection]
      return current === value
    }),
  )
}

export function getDisabledReason(partial: Partial<QuoteSelection>): string | null {
  const match = RENTAL_CONDITIONS.disabledCombinations.find((rule) =>
    Object.entries(rule.when).every(([key, value]) => {
      const current = partial[key as keyof QuoteSelection]
      return current === undefined || current === value
    }),
  )
  return match?.reason ?? null
}

export function isOptionDisabled(
  field: keyof QuoteSelection,
  value: QuoteSelection[keyof QuoteSelection],
  current: QuoteSelection,
): boolean {
  return isCombinationDisabled({ ...current, [field]: value })
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  ...DEFAULT_QUOTE_SELECTION,
  exteriorColorId: DEFAULT_EXTERIOR_COLOR_ID,
  consultationModalOpen: false,

  setTrim: (trimId) => set({ trimId }),
  setExteriorColor: (exteriorColorId) => set({ exteriorColorId }),
  setPrepaymentPercent: (prepaymentPercent) => set({ prepaymentPercent }),
  setDepositPercent: (depositPercent) => set({ depositPercent }),
  setAnnualMileage: (annualMileage) => {
    if (isOptionDisabled('annualMileage', annualMileage, get().getSelection())) return
    set({ annualMileage })
  },
  setContractMonths: (contractMonths) => set({ contractMonths }),
  patchSelection: (partial) => set(partial),
  openConsultationModal: () => set({ consultationModalOpen: true }),
  closeConsultationModal: () => set({ consultationModalOpen: false }),
  getSelection: () => {
    const {
      trimId,
      prepaymentPercent,
      depositPercent,
      annualMileage,
      contractMonths,
    } = get()
    return {
      trimId,
      prepaymentPercent,
      depositPercent,
      annualMileage,
      contractMonths,
    }
  },
}))
