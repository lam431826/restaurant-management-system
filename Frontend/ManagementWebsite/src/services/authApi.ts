import { apiRequest } from './apiClient'

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAITER'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: UserRole
}

export interface LoginResponse {
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  user?: AuthUser
  requiresVerification?: boolean
  verifyToken?: string
}

export const login = (username: string, password: string) =>
  apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ username, password }),
  })

export const logout = () =>
  apiRequest<void>('/api/auth/logout', {
    method: 'POST',
  })
