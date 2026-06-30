const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '')

export function getImageUrl(path) {
  if (!path) return null
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return API_BASE + (path.startsWith('/') ? path : '/' + path)
}
