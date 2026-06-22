import { createContext, useContext, useState, type ReactNode } from 'react'

export type UserRole = 'WAITER' | 'CASHIER' | 'MANAGER' | 'ADMIN'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: UserRole
}

interface Session {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

interface AuthContextType {
  user: AuthUser | null
  saveSession: (session: Session) => void
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = localStorage.getItem('user')
  const [user, setUser] = useState<AuthUser | null>(stored ? JSON.parse(stored) : null)

  const saveSession = ({ accessToken, refreshToken, user: u }: Session) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const signOut = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, saveSession, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
