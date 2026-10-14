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

  async updatePost(postId, payload) {
    const response = await apiClient.put(`/posts/${postId}`, payload)
    return response.data
  },

  async deletePost(postId) {
    await apiClient.delete(`/posts/${postId}`)
  },

  async getComments(postId) {
    const response = await apiClient.get(`/posts/${postId}/comments`)
    return response.data
  },

  async createComment(postId, payload) {
    const response = await apiClient.post(`/posts/${postId}/comments`, payload)
    return response.data
  },

  async updateComment(commentId, payload) {
    const response = await apiClient.put(`/comments/${commentId}`, payload)
    return response.data
  },

  async deleteComment(commentId) {
    await apiClient.delete(`/comments/${commentId}`)
  },

  async getLikeStatus(postId) {
    const response = await apiClient.get(`/posts/${postId}/likes`)
    return response.data
  },

  async addLike(postId) {
    const response = await apiClient.post(`/posts/${postId}/likes`)
    return response.data
  },

  async removeLike(postId) {
    const response = await apiClient.delete(`/posts/${postId}/likes`)
    return response.data
  },
}
