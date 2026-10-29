import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createPricingProvider } from '@/services/pricing'
import type { QuoteResult, QuoteSelection } from '@/types'

export function useQuotePricing(selection: QuoteSelection) {
  const providerQuery = useQuery({
    queryKey: ['pricing-provider'],
    queryFn: createPricingProvider,
    staleTime: Infinity,
  })

  const selectionKey = useMemo(
    () =>
      [
        selection.trimId,
        selection.prepaymentPercent,
        selection.depositPercent,
        selection.annualMileage,
        selection.contractMonths,
        selection.exteriorColorId ?? '',
        (selection.selectedOptionIds ?? []).join(','),
      ].join('|'),
    [selection],
  )

  const quoteQuery = useQuery({
    queryKey: ['quote', selectionKey],
    enabled: Boolean(providerQuery.data),
    queryFn: () => providerQuery.data!.calculateQuote(selection),
  })

  let quote: QuoteResult | undefined = quoteQuery.data
  let status: QuoteResult['status'] = 'idle'

  if (providerQuery.isLoading || quoteQuery.isLoading) {
    status = 'loading'
  } else if (providerQuery.isError || quoteQuery.isError) {
    status = 'error'
    quote = {
      status: 'error',
      currency: 'KRW',
      monthlyRent: null,
      message: '견적 확인 중 오류가 발생했습니다',
      disclaimer: '잠시 후 다시 시도하거나 상담으로 문의해 주세요.',
      pricingVersionId: null,
      calculatedAt: new Date().toISOString(),
    }
  } else if (quote) {
    status = quote.status
  }

  return {
    provider: providerQuery.data,
    quote,
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
  }
}
