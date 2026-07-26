const configuredBackendUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

// API calls use Vite's /api proxy when no backend URL is configured. Assets are not part
// of that proxy, so development keeps the existing direct localhost fallback for them.
export const apiBaseUrl = configuredBackendUrl ? `${configuredBackendUrl}/api` : '/api'
export const assetBaseUrl = configuredBackendUrl || 'http://localhost:8080'

export const toClientPath = (path: string) => {
  if (path === '/api') return '/'
  return path.startsWith('/api/') ? path.slice(4) : path
}
