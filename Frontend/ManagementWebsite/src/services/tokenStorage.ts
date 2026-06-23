const ACCESS_TOKEN_KEY = 'rms.accessToken'
const USER_KEY = 'rms.user'

export interface StoredUser {
  id: string
  username: string
  fullName: string
  role: string
}

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)

export const saveAuth = (accessToken: string, user?: StoredUser) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

export const getStoredUser = (): StoredUser | null => {
  const value = localStorage.getItem(USER_KEY)
  if (!value) return null

  try {
    return JSON.parse(value) as StoredUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const clearAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
