import { api } from './api'
import type { ApiResponse } from './api'

// ── Frontend-facing types (seats↔capacity, order↔displayOrder) ─────────

export interface TableItem {
  id: string
  name: string
  note: string
  area: string
  seats: number
  order: number
  active: boolean
  status: string
  qrToken: string | null
}

export interface TableArea {
  id: string
  name: string
  note: string
}

export interface TableInput {
  name: string
  note?: string
  area?: string
  seats?: number
  order?: number
  active?: boolean
}

// ── Backend wire shapes ────────────────────────────────────────────────

interface TableResponse {
  id: string
  name: string
  note: string | null
  area: string | null
  capacity: number
  displayOrder: number
  active: boolean
  status: string
  qrToken: string | null
}

const toItem = (t: TableResponse): TableItem => ({
  id: t.id,
  name: t.name,
  note: t.note ?? '',
  area: t.area ?? '',
  seats: t.capacity,
  order: t.displayOrder,
  active: t.active,
  status: t.status,
  qrToken: t.qrToken,
})

const toBody = (input: TableInput) => ({
  name: input.name,
  note: input.note,
  area: input.area,
  capacity: input.seats,
  displayOrder: input.order,
  active: input.active,
})

// ── Tables ─────────────────────────────────────────────────────────────

export const listTables = (): Promise<TableItem[]> =>
  api.get<ApiResponse<TableResponse[]>>('/api/tables').then(r => r.data.map(toItem))

export const createTable = (input: TableInput): Promise<TableItem> =>
  api.post<ApiResponse<TableResponse>>('/api/tables', toBody(input)).then(r => toItem(r.data))

export const updateTable = (id: string, input: TableInput): Promise<TableItem> =>
  api.put<ApiResponse<TableResponse>>(`/api/tables/${id}`, toBody(input)).then(r => toItem(r.data))

export const setTableActive = (id: string, active: boolean): Promise<void> =>
  api.patch<void>(`/api/tables/${id}/active`, { active })

export const deleteTable = (id: string): Promise<void> => api.del<void>(`/api/tables/${id}`)

// ── Import / Export ────────────────────────────────────────────────────

export interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: { row: number; reason: string }[]
}

export const importTablesCsv = (file: File): Promise<ImportResult> => {
  const form = new FormData()
  form.append('file', file)
  return api.postForm<ApiResponse<ImportResult>>('/api/tables/import', form).then(r => r.data)
}

export const exportTablesCsv = async (): Promise<void> => {
  const blob = await api.getBlob('/api/tables/export')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'tables-export.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// ── Areas ──────────────────────────────────────────────────────────────

export const listAreas = (): Promise<TableArea[]> =>
  api.get<ApiResponse<TableArea[]>>('/api/tables/areas').then(r => r.data)

export const createArea = (name: string, note: string): Promise<TableArea> =>
  api.post<ApiResponse<TableArea>>('/api/tables/areas', { name, note }).then(r => r.data)

export const deleteArea = (id: string): Promise<void> => api.del<void>(`/api/tables/areas/${id}`)
