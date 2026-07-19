// Thin fetch wrapper around the RMS backend.
// Reads the base URL from VITE_API_URL (default http://localhost:8080),
// injects the stored JWT, and normalises error responses.

import { refreshAccessToken, handleAuthFailure } from './authRefresh'

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '')

const TOKEN_KEY = 'access_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)

/** Resolves a possibly-relative asset path (e.g. /uploads/menu/x.jpg) to an absolute URL. */
export const assetUrl = (path: string | null | undefined): string => {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return API_BASE + (path.startsWith('/') ? path : '/' + path)
}

export const setToken = (token: string | null): void => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  code?: string
  fieldErrors?: Record<string, string>

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

type Query = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: string
  body?: unknown
  query?: Query
  /** When true, body is sent as-is (FormData) without JSON headers. */
  form?: boolean
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(API_BASE + path)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

async function toApiError(res: Response): Promise<ApiError> {
  let code: string | undefined
  let message = res.statusText
  let fieldErrors: Record<string, string> | undefined
  try {
    const body = await res.json()
    code = body.error
    message = body.message ?? message
    fieldErrors = body.fieldErrors ?? undefined
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, message, code, fieldErrors)
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, form } = opts
  const init: RequestInit = { method, headers: authHeaders() }

  if (form) {
    init.body = body as FormData
  } else if (body !== undefined) {
    ;(init.headers as Headers).set('Content-Type', 'application/json')
    init.body = JSON.stringify(body)
  }

  let res = await fetch(buildUrl(path, query), init)

  // FE-MGMT-01 fix: this client previously had no 401 handling at all — a request made
  // after the 8h access token expired just failed outright instead of silently refreshing
  // and retrying like src/api/apiClient.ts already does for auth/users/audit-logs calls.
  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken()
      ;(init.headers as Headers).set('Authorization', `Bearer ${newToken}`)
      res = await fetch(buildUrl(path, query), init)
    } catch {
      handleAuthFailure()
      throw await toApiError(res)
    }
  }

  if (!res.ok) throw await toApiError(res)

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData, form: true }),

  /** Fetch a binary response (e.g. CSV export) as a Blob. */
  async getBlob(path: string, query?: Query): Promise<Blob> {
    let res = await fetch(buildUrl(path, query), { headers: authHeaders() })
    if (res.status === 401) {
      try {
        await refreshAccessToken()
        // authHeaders() re-reads access_token from localStorage, so it already picks up
        // the token refreshAccessToken() just wrote there.
        res = await fetch(buildUrl(path, query), { headers: authHeaders() })
      } catch {
        handleAuthFailure()
        throw await toApiError(res)
      }
    }
    if (!res.ok) throw await toApiError(res)
    return res.blob()
  },
}

/** Envelope shapes returned by the backend. */
export interface ApiResponse<T> {
  data: T
  message?: string
  timestamp?: string
}

export interface PageResponse<T> {
  data: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
