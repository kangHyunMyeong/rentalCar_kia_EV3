import { useState } from 'react'

/** 이미지 로드 실패 시 레이아웃이 무너지지 않도록 fallback 상태 제공 */
export function useVehicleImage(src: string) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  return {
    src: failed ? undefined : src,
    failed,
    loaded,
    onError: () => setFailed(true),
    onLoad: () => setLoaded(true),
  }
}
