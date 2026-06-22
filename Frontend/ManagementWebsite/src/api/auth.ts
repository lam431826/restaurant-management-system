import apiClient from './apiClient'

export const login = (username: string, password: string) =>
  apiClient.post('/auth/login', { username, password })

export const logout = () =>
  apiClient.post('/auth/logout')

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiClient.post('/auth/change-password', { currentPassword, newPassword })

export const verifyInfo = (verifyToken: string) =>
  apiClient.post('/auth/verify/info', null, {
    headers: { 'X-Verify-Token': verifyToken },
  })

export const verifyOtp = (verifyToken: string, otp: string) =>
  apiClient.post('/auth/verify/otp', { otp }, {
    headers: { 'X-Verify-Token': verifyToken },
  })

export const resendOtp = (verifyToken: string) =>
  apiClient.post('/auth/resend-otp', { verifyToken })

export const forgotPassword = (username: string) =>
  apiClient.post('/auth/forgot-password', { username })

export const resetPassword = (resetToken: string, otp: string, newPassword: string) =>
  apiClient.post('/auth/reset-password', { otp, newPassword }, {
    headers: { 'X-Reset-Token': resetToken },
  })
