import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type AuthUser, type Session } from './authState'
import { clearAuth, getStoredUser, saveSession as persistSession } from '../services/tokenStorage'

export type { AuthUser, UserRole } from './authState'

// BR-AUTH-03: idle/inactivity timeout (default 30 min). Timing out is equivalent to a
// logout — it only clears the client session; the work shift / cash shift live on the
// server and are restored on the next login (BR-AUTH-02).
const IDLE_TIMEOUT_MS = 30 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)

  const saveSession = (session: Session) => {
    persistSession(session)
    setUser(session.user)
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

  const signOut = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

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
  }, [signOut, user])

  return (
    <AuthContext.Provider value={{ user, saveSession, updateUser, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}
