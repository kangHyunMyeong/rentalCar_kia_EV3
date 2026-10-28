import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_EXTERIOR_COLOR_ID } from '@/data/colors'
import { DEFAULT_QUOTE_SELECTION } from '@/data/rental-conditions'
import { isOptionDisabled, useQuoteStore } from './quoteStore'

describe('quoteStore', () => {
  beforeEach(() => {
    useQuoteStore.setState({
      ...DEFAULT_QUOTE_SELECTION,
      exteriorColorId: DEFAULT_EXTERIOR_COLOR_ID,
      consultationModalOpen: false,
    })
  })

  it('초기 선택값이 권장 조건과 일치한다', () => {
    const state = useQuoteStore.getState()
    expect(state.prepaymentPercent).toBe(10)
    expect(state.depositPercent).toBe(0)
    expect(state.annualMileage).toBe(20000)
    expect(state.contractMonths).toBe(60)
    expect(state.trimId).toBe('LONG_RANGE_EARTH')
    expect(state.exteriorColorId).toBe('ISM')
  })

  it('트림 변경이 상태에 반영된다', () => {
    useQuoteStore.getState().setTrim('STANDARD_GT_LINE')
    expect(useQuoteStore.getState().trimId).toBe('STANDARD_GT_LINE')
  })

  it('외장 컬러는 Color Studio 상태에만 저장되고 견적 선택에는 포함되지 않는다', () => {
    useQuoteStore.getState().setExteriorColor('ABP')
    expect(useQuoteStore.getState().exteriorColorId).toBe('ABP')
    expect(useQuoteStore.getState().getSelection()).not.toHaveProperty('exteriorColorId')
  })

  it('상담 모달 open/close가 동작한다', () => {
    useQuoteStore.getState().openConsultationModal()
    expect(useQuoteStore.getState().consultationModalOpen).toBe(true)
    useQuoteStore.getState().closeConsultationModal()
    expect(useQuoteStore.getState().consultationModalOpen).toBe(false)
  })

  it('무제한 주행거리 선택이 가능하다', () => {
    useQuoteStore.getState().setAnnualMileage('unlimited')
    expect(useQuoteStore.getState().annualMileage).toBe('unlimited')
    expect(
      isOptionDisabled('annualMileage', 'unlimited', useQuoteStore.getState().getSelection()),
    ).toBe(false)
  })
})
