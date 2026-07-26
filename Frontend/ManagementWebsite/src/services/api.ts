import axios, { type AxiosRequestConfig } from 'axios'
import apiClient from '../api/apiClient'
import { assetBaseUrl, toClientPath } from './apiConfig'

/** Resolves a possibly-relative asset path (e.g. /uploads/menu/x.jpg) to an absolute URL. */
export const assetUrl = (path: string | null | undefined): string => {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return assetBaseUrl + (path.startsWith('/') ? path : `/${path}`)
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

interface ApiErrorBody {
  error?: string
  message?: string
  fieldErrors?: Record<string, string>
}

type Query = Record<string, string | number | boolean | undefined | null>

const readErrorBody = async (body: unknown): Promise<ApiErrorBody | null> => {
  if (body instanceof Blob) {
    try {
      return JSON.parse(await body.text()) as ApiErrorBody
    } catch {
      return null
    }
  }
  return body && typeof body === 'object' ? (body as ApiErrorBody) : null
}

const toApiError = async (error: unknown): Promise<ApiError> => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return new ApiError(0, error instanceof Error ? error.message : 'Không thể kết nối máy chủ')
  }
  if (!error.response) {
    return new ApiError(0, 'Không thể kết nối máy chủ')
  }
  const status = error.response?.status ?? 0
  const body = await readErrorBody(error.response?.data)
  const message = body?.message || body?.error || error.message || `Request failed (${status})`
  return new ApiError(status, message, body?.error, body?.fieldErrors)
}

const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await apiClient.request<T>({
      ...config,
      url: toClientPath(config.url ?? '/'),
    })
    return response.data
  } catch (error) {
    throw await toApiError(error)
  }
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>({ method: 'GET', url: path, params: query }),
  post: <T>(path: string, body?: unknown) => request<T>({ method: 'POST', url: path, data: body }),
  put: <T>(path: string, body?: unknown) => request<T>({ method: 'PUT', url: path, data: body }),
  patch: <T>(path: string, body?: unknown) => request<T>({ method: 'PATCH', url: path, data: body }),
  del: <T>(path: string) => request<T>({ method: 'DELETE', url: path }),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>({ method: 'POST', url: path, data: formData }),
  getBlob: (path: string, query?: Query) =>
    request<Blob>({ method: 'GET', url: path, params: query, responseType: 'blob' }),
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
