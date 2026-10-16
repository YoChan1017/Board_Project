import apiClient from './client'

export const boardApi = {
  async getBoards() {
    const response = await apiClient.get('/boards')
    return response.data
  },

  async getBoard(boardId) {
    const response = await apiClient.get(`/boards/${boardId}`)
    return response.data
  },

  async createBoard(payload) {
    const response = await apiClient.post('/boards', payload)
    return response.data
  },

  async updateBoard(boardId, payload) {
    const response = await apiClient.put(`/boards/${boardId}`, payload)
    return response.data
  },

  async deleteBoard(boardId) {
    await apiClient.delete(`/boards/${boardId}`)
  },

  async getCategories(boardId) {
    const response = await apiClient.get(`/boards/${boardId}/categories`)
    return response.data
  },

  async createCategory(boardId, payload) {
    const response = await apiClient.post(`/boards/${boardId}/categories`, payload)
    return response.data
  },

  async updateCategory(categoryId, payload) {
    const response = await apiClient.put(`/categories/${categoryId}`, payload)
    return response.data
  },

  async deleteCategory(categoryId) {
    await apiClient.delete(`/categories/${categoryId}`)
  },

  async getPosts(boardId, { page = 0, size = 10, keyword = '' } = {}) {
    const response = await apiClient.get(`/boards/${boardId}/posts`, {
      params: { page, size, ...(keyword.trim() ? { keyword: keyword.trim() } : {}) },
    })
    return response.data
  },

  async getMyPosts({ page = 0, size = 10, keyword = '' } = {}) {
    const response = await apiClient.get('/me/posts', {
      params: { page, size, ...(keyword.trim() ? { keyword: keyword.trim() } : {}) },
    })
    return response.data
  },

  async getMyComments({ page = 0, size = 10, keyword = '' } = {}) {
    const response = await apiClient.get('/me/comments', {
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

  async getAttachments(postId) {
    const response = await apiClient.get(`/posts/${postId}/attachments`)
    return response.data
  },

  async uploadAttachment(postId, file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/posts/${postId}/attachments`, formData)
    return response.data
  },

  async downloadAttachment(attachmentId) {
    const response = await apiClient.get(`/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  async deleteAttachment(attachmentId) {
    await apiClient.delete(`/attachments/${attachmentId}`)
  },
}
