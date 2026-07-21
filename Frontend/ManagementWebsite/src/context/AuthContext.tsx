import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type UserRole = 'WAITER' | 'CASHIER' | 'MANAGER' | 'ADMIN'

// BR-AUTH-03: idle/inactivity timeout (default 30 min). Timing out is equivalent to a
// logout — it only clears the client session; the work shift / cash shift live on the
// server and are restored on the next login (BR-AUTH-02).
const IDLE_TIMEOUT_MS = 30 * 60 * 1000

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
  updateUser: (patch: Partial<AuthUser>) => void
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

  // Bug fix: profile edits (e.g. /my-profile) previously only updated the server-side
  // `employees`/`users` rows — the cached session here was left stale until the next login.
  const updateUser = (patch: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  const signOut = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  // BR-AUTH-03: auto sign-out after a period of inactivity.
  useEffect(() => {
    if (!user) return
    let timer: number
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(signOut, IDLE_TIMEOUT_MS)
    }
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      window.clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <AuthContext.Provider value={{ user, saveSession, updateUser, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
