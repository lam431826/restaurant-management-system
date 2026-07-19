import axios from 'axios'
import { refreshAccessToken, handleAuthFailure } from '../services/authRefresh'

const apiClient = axios.create({ baseURL: '/api' })

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        // FE-MGMT-02 fix: concurrent 401s now await the same in-flight refresh instead of
        // each independently bailing to /login (which could log a user out from a request
        // that arrived a moment before a refresh that would have succeeded).
        const newAccessToken = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(original)
      } catch {
        handleAuthFailure()
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
