import { getAccessToken } from './tokenStorage'

export interface ApiResponse<T> {
  data: T
  message?: string
  timestamp: string
}

interface ApiErrorBody {
  error?: string
  message?: string
  fieldErrors?: Record<string, string>
}

export class ApiClientError extends Error {
  status: number
  code?: string
  fieldErrors?: Record<string, string>

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

interface ApiRequestOptions extends RequestInit {
  auth?: boolean
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const { auth = true, ...requestOptions } = options
  const headers = new Headers(requestOptions.headers)

  if (requestOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAccessToken()
  if (auth && token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers,
  })

  const responseText = await response.text()
  let responseBody: unknown = null

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = responseText
    }
  }

  if (!response.ok) {
    const errorBody =
      responseBody && typeof responseBody === 'object'
        ? (responseBody as ApiErrorBody)
        : null
    const message = errorBody?.message || errorBody?.error || responseText || `Request failed (${response.status})`
    throw new ApiClientError(response.status, message, errorBody?.error, errorBody?.fieldErrors)
  }

  return responseBody as T
}

export const apiData = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const response = await apiRequest<ApiResponse<T>>(path, options)
  return response.data
}
