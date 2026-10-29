import type { LeadRequest, LeadResponse } from '@/types'
import {
  ADMIN_LEAD_API_URL,
  ADMIN_LEAD_SITE_SLUG,
} from './adminLeadConfig'
import { buildAdminLeadBody } from './buildAdminLeadBody'
import type { LeadService } from './LeadService'

const SUCCESS_MESSAGE =
  '상담 신청이 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.'

function isEncodingError(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const code = (payload as { code?: unknown; error?: unknown }).code
  const error = (payload as { error?: unknown }).error
  return code === 'ENCODING_ERROR' || error === 'ENCODING_ERROR'
}

async function postUtf8Json(body: unknown): Promise<Response> {
  return fetch(ADMIN_LEAD_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json()
    if (data && typeof data === 'object') {
      const msg =
        (data as { message?: unknown }).message ??
        (data as { error?: unknown }).error
      if (typeof msg === 'string' && msg.trim()) return msg
    }
  } catch {
    /* ignore parse errors */
  }
  return `상담 신청에 실패했습니다. (${res.status})`
}

/**
 * Multi Landing Admin 공개 리드 API 연동.
 * UTF-8 JSON POST만 사용합니다 (form-urlencoded 금지).
 */
export class AdminLeadService implements LeadService {
  async submitLead(request: LeadRequest): Promise<LeadResponse> {
    const body = buildAdminLeadBody(request, {
      landingSlug: ADMIN_LEAD_SITE_SLUG,
    })

    let res = await postUtf8Json(body)

    if (!res.ok) {
      let errorPayload: unknown = null
      try {
        errorPayload = await res.clone().json()
      } catch {
        errorPayload = null
      }

      if (isEncodingError(errorPayload)) {
        // 서버 ENCODING_ERROR → UTF-8 JSON 재전송
        res = await postUtf8Json(body)
      }
    }

    if (res.status === 201) {
      let referenceId: string | undefined
      try {
        const data: unknown = await res.json()
        if (data && typeof data === 'object') {
          const id =
            (data as { id?: unknown }).id ??
            (data as { referenceId?: unknown }).referenceId
          if (typeof id === 'string') referenceId = id
        }
      } catch {
        /* 본문 없어도 201이면 성공 */
      }

      return {
        mode: 'live',
        accepted: true,
        message: SUCCESS_MESSAGE,
        referenceId,
      }
    }

    throw new Error(await readErrorMessage(res))
  }
}
