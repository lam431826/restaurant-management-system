import { createContext, useContext, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api, setToken, getToken, ApiError } from '../services/api'

export type Role = 'WAITER' | 'CASHIER' | 'MANAGER' | 'ADMIN'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: Role
}

interface LoginResponse {
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  user?: AuthUser
  requiresVerification?: boolean
  verifyToken?: string
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const USER_KEY = 'rms.user'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const readStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)
  const [token, setTokenState] = useState<string | null>(getToken())

  const login = async (username: string, password: string): Promise<AuthUser> => {
    const res = await api.post<LoginResponse>('/api/auth/login', { username, password })
    if (res.requiresVerification || !res.accessToken || !res.user) {
      throw new ApiError(403, 'Tài khoản cần xác thực OTP trước khi đăng nhập.', 'ACCOUNT_UNVERIFIED')
    }
    setToken(res.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
    setTokenState(res.accessToken)
    setUser(res.user)
    return res.user
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem(USER_KEY)
    setTokenState(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(() => ({ user, token, login, logout }), [user, token])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/** Redirects to /login when there is no valid session token. */
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
