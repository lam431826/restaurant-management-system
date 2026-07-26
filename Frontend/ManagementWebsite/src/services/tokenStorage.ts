import type { AuthUser, Session } from '../context/authState'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user'

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)

export const saveTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export const saveSession = ({ accessToken, refreshToken, user }: Session) => {
  saveTokens(accessToken, refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const getStoredUser = (): AuthUser | null => {
  const value = localStorage.getItem(USER_KEY)
  if (!value) return null

  try {
    return JSON.parse(value) as AuthUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const clearAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
