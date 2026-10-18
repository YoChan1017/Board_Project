import apiClient from './client'

export const adminUserApi = {
  async getUsers() {
    const response = await apiClient.get('/admin/users')
    return response.data
  },
}
