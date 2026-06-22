import apiClient from './apiClient'

export function listUsers(page = 0, size = 100) {
  return apiClient.get('/users', { params: { page, size } })
}

export function createUser(data) {
  return apiClient.post('/users', data)
}

export function updateUser(id, data) {
  return apiClient.put(`/users/${id}`, data)
}

export function deleteUser(id) {
  return apiClient.delete(`/users/${id}`)
}

export function unlockUser(id) {
  return apiClient.post(`/users/${id}/unlock`)
}
