import apiClient from './client'

export const authApi = {
  async signup(payload) {
    const response = await apiClient.post('/auth/signup', payload)
    return response.data
  },

  async login(payload) {
    const response = await apiClient.post('/auth/login', payload)
    return response.data
  },

  async me() {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}
