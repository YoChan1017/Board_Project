import apiClient from './client'

export const boardApi = {
  async getBoards() {
    const response = await apiClient.get('/boards')
    return response.data
  },

  async getCategories(boardId) {
    const response = await apiClient.get(`/boards/${boardId}/categories`)
    return response.data
  },

  async getPosts(boardId, { page = 0, size = 10, keyword = '' } = {}) {
    const response = await apiClient.get(`/boards/${boardId}/posts`, {
      params: { page, size, ...(keyword.trim() ? { keyword: keyword.trim() } : {}) },
    })
    return response.data
  },

  async getPost(postId) {
    const response = await apiClient.get(`/posts/${postId}`)
    return response.data
  },

  async createPost(boardId, payload) {
    const response = await apiClient.post(`/boards/${boardId}/posts`, payload)
    return response.data
  },
}
