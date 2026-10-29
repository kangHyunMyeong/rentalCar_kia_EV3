export {
  calculateV4RentalEstimate,
  compareV4MileageModes,
  compareV4PrepaymentModes,
  roundV4MonthlyRent,
} from './calculator'
export { V4_ENGINE_META, V4_PDF_OPTION_NOTES } from './config'
export {
  assertPdfPriceExamples,
  resolveV4VehiclePrice,
  validateEv3OptionSelection,
} from './vehiclePrice'
export type {
  V4AssumptionRecord,
  V4EstimateInput,
  V4EstimateResult,
  V4EstimateStatus,
  V4EvidenceKind,
  V4MileageMode,
  V4PrepaymentMode,
  V4RentalEstimate,
} from './types'
/** UI 연동 준비 어댑터 — 운영 Provider 미연결 */
export {
  V4_UI_COPY,
  formatV4MonthlyRentKrw,
  normalizeQuoteSelectionToV4UiInput,
  toV4UiEstimate,
  toV4UiEstimateFromQuoteSelection,
} from './uiAdapter'
