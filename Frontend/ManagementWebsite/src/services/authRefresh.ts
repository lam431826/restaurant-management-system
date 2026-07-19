// Shared 401-recovery logic used by all three HTTP clients in this app (src/api/apiClient.ts,
// services/api.ts, services/apiClient.ts). Extracted so a refreshed/revoked session is handled
// consistently everywhere instead of only on the axios client (FE-MGMT-01), and so concurrent
// 401s share one in-flight refresh instead of racing each other into an immediate logout
// (FE-MGMT-02).

let refreshPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) throw new Error('No refresh token available')

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) throw new Error('Refresh token request failed')

  const data = await res.json()
  localStorage.setItem('access_token', data.accessToken)
  localStorage.setItem('refresh_token', data.refreshToken)
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
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  window.location.hash = '/login'
}
