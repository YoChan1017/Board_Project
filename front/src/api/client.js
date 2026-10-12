import axios from 'axios'

export const TOKEN_STORAGE_KEY = 'board_project_access_token'
export const USER_STORAGE_KEY = 'board_project_user'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const requestUrl = error.config?.url ?? ''
    const isPublicAuthRequest =
      requestUrl.endsWith('/auth/login') || requestUrl.endsWith('/auth/signup')

    if (status === 401 && !isPublicAuthRequest) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      window.localStorage.removeItem(USER_STORAGE_KEY)
      window.dispatchEvent(new Event('board:unauthorized'))
    }

    return Promise.reject(error)
  },
)

export function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  return error.response?.data?.message ?? error.message ?? fallback
}

export default apiClient
