import { apiBaseUrl } from './apiConfig'
import { clearAuth, getRefreshToken, saveTokens } from './tokenStorage'

// Shared 401-recovery logic for the single Axios transport. Concurrent 401s share one
// in-flight refresh instead of racing each other into an immediate logout (FE-MGMT-02).

let refreshPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')

  const res = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) throw new Error('Refresh token request failed')

  const data = await res.json()
  saveTokens(data.accessToken, data.refreshToken)
  return data.accessToken as string
}

/** Concurrent callers share the same in-flight refresh instead of each firing their own. */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export function handleAuthFailure(): void {
  clearAuth()
  window.location.hash = '/login'
}
