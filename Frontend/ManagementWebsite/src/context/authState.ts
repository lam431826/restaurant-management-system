import { createContext } from 'react'

export type UserRole = 'WAITER' | 'CASHIER' | 'MANAGER' | 'ADMIN'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: UserRole
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface AuthContextValue {
  user: AuthUser | null
  saveSession: (session: Session) => void
  updateUser: (patch: Partial<AuthUser>) => void
  signOut: () => void
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
