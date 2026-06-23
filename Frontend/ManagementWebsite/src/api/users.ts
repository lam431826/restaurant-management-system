import apiClient from './apiClient'

export interface UserDto {
  id: string
  username: string
  fullName: string
  email: string
  phone: string
  role: string
  status: string
  createdAt: string
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UsersPage {
  data: UserDto[]
  pagination: PageMeta
}

export const listUsers = (page = 0, size = 100) =>
  apiClient.get<UsersPage>('/users', { params: { page, size } })

export const getUser = (id: string) =>
  apiClient.get<{ data: UserDto }>(`/users/${id}`)

export const createUser = (req: {
  username: string
  fullName: string
  email?: string
  phone?: string
  role: string
}) => apiClient.post<{ data: { user: UserDto; tempPassword: string } }>('/users', req)

export const updateUser = (id: string, req: {
  fullName?: string
  email?: string
  phone?: string
  role?: string
  status?: string
}) => apiClient.put<{ data: UserDto }>(`/users/${id}`, req)

export const deleteUser = (id: string) =>
  apiClient.delete(`/users/${id}`)

export const unlockUser = (id: string) =>
  apiClient.post(`/users/${id}/unlock`)
