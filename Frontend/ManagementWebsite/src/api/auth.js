import apiClient from './apiClient'

export function login(username, password) {
  return apiClient.post('/auth/login', { username, password })
}

export function verifyInfo(verifyToken) {
  return apiClient.post('/auth/verify/info', null, {
    headers: { 'X-Verify-Token': verifyToken },
  })
}

export function verifyOtp(verifyToken, otp) {
  return apiClient.post('/auth/verify/otp', { otp }, {
    headers: { 'X-Verify-Token': verifyToken },
  })
}

export function resendOtp(verifyToken) {
  return apiClient.post('/auth/resend-otp', { verifyToken })
}

export function forgotPassword(username) {
  return apiClient.post('/auth/forgot-password', { username })
}

export function resetPassword(resetToken, otp, newPassword) {
  return apiClient.post('/auth/reset-password', { otp, newPassword }, {
    headers: { 'X-Reset-Token': resetToken },
  })
}

export function logout() {
  return apiClient.post('/auth/logout')
}
