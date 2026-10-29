export {
  ACQUISITION_DELTA_SCENARIOS,
  CONTRACT_MONTHS,
  FINANCE_RATE_SCENARIOS,
  INSURANCE_SCENARIOS,
  MAINTENANCE_SCENARIOS,
  PREPAYMENT_PERCENTS,
  PRICE_DELTA_AMOUNTS,
  RESIDUAL_SCENARIO_RATES,
  allSingleFactorScenarios,
  buildAcquisitionDeltaScenarios,
  buildAcquisitionDiscountOnlyScenarios,
  buildFinanceScenarios,
  buildInsuranceScenarios,
  buildMaintenanceScenarios,
  buildResidualScenarios,
  buildVehiclePriceBasisScenarios,
  buildVehiclePriceChangeScenarios,
} from './sensitivityScenarios'
export {
  EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED,
  buildEv3GtPerformanceSubsidyReference,
  buildEvSubsidyAssessment,
  mapTrimToAnnouncedNationalSubsidy,
} from './evSubsidyScenarios'
export type {
  AmountCertainty,
  EvSubsidyAmountField,
  EvSubsidyAssessment,
  LessorReceiptStatus,
  SubsidyEligibilityStatus,
} from './evSubsidyTypes'
export {
  EXPECTED_OFFICIAL_TRIM_PRICES,
  KIA_OFFICIAL_PRICE_PAGE,
  buildCoreRealityScenarios,
} from './vehicleCostScenarios'
export type {
  RealityScenarioId,
  VehicleCostScenarioDef,
} from './vehicleCostScenarios'
export {
  assertResidualFixedWhenAcquisitionOnly,
  runAllRealityScenariosForTrim,
  runVehicleCostScenario,
} from './acquisitionCostAnalysis'
export type { SeparatedCostBases } from './acquisitionCostAnalysis'
export {
  STEP72_CUSTOMER_COPY_PROPOSAL,
  STEP72_REFERENCE_MONTHLIES,
  analyzeWhyV4MayReadHigh,
  buildScenarioMonthlyTable,
  collectSubsidyReport,
  compareEnginesLongRangeEarthZeroPrepay,
  getOpsRecommendations,
  runFullTrimScenarioMatrix,
  verifyOfficialPriceBookAgainstExpected,
} from './estimateRealityCheck'
export type {
  OpsRecommendation,
  OpsRecommendationId,
} from './estimateRealityCheck'
export {
  analyzeTermOrder,
  applySensitivityOverrides,
  assertDefaultV4Unchanged,
  buildLotteReferenceComparisonTable,
  buildPrepaymentMatrix,
  calculateWithConfigSnapshot,
  compareVehiclePriceVsAcquisitionDiscount,
  getPrepaymentBasisNotes,
  getVatAndTaxAnalysisNotes,
  rankFactorImpacts,
  runBaselineSensitivity,
  runSensitivityScenario,
  snapshotDefaultV4Config,
} from './sensitivityCalculator'
export type { FactorImpactRankRow } from './sensitivityTypes'
export type {
  PrepayMatrixCell,
  PriceModeComparisonRow,
} from './sensitivityCalculator'
export type {
  PrepaymentDepositBasis,
  PriceAdjustmentMode,
  SensitivityConfigSnapshot,
  SensitivityDeltaVsBaseline,
  SensitivityEstimateMetrics,
  SensitivityFactor,
  SensitivityOverrides,
  SensitivityResult,
  SensitivityRunResult,
  SensitivityScenarioMeta,
} from './sensitivityTypes'
