import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/authApi'
import {
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
} from '../api/client'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const value = window.localStorage.getItem(USER_STORAGE_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    window.localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }
}

function saveUser(user) {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

function clearStoredAuth() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(USER_STORAGE_KEY)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false

    const handleUnauthorized = () => {
      setUser(null)
    }

    window.addEventListener('board:unauthorized', handleUnauthorized)

    async function restoreSession() {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
      if (!token) {
        setIsInitializing(false)
        return
      }

      try {
        // Refresh the profile from the API; local storage is only a session cache.
        const me = await authApi.me()
        const savedUser = readStoredUser() ?? {}
        const restoredUser = { ...savedUser, ...me }

        if (!me.username) {
          throw new Error('사용자 정보를 확인할 수 없습니다.')
        }

        if (!cancelled) {
          saveUser(restoredUser)
          setUser(restoredUser)
        }
      } catch {
        clearStoredAuth()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsInitializing(false)
      }
    }

    restoreSession()
    return () => {
      cancelled = true
      window.removeEventListener('board:unauthorized', handleUnauthorized)
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials)
    if (!response.accessToken) {
      throw new Error('로그인 응답에 인증 토큰이 없습니다.')
    }

    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken)
    try {
      const me = await authApi.me()
      const loggedInUser = {
        userId: me.userId ?? response.userId,
        username: me.username ?? response.username,
        nickname: me.nickname ?? response.nickname,
        email: me.email ?? null,
        role: me.role ?? response.role,
        createdAt: me.createdAt,
        updatedAt: me.updatedAt,
      }
      saveUser(loggedInUser)
      setUser(loggedInUser)
      return loggedInUser
    } catch (error) {
      clearStoredAuth()
      setUser(null)
      throw error
    }
  }, [])

  const updateCurrentUser = useCallback((updates) => {
    const current = readStoredUser()
    if (!current) return
    const updated = { ...current, ...updates }
    saveUser(updated)
    setUser(updated)
  }, [])

  const logout = useCallback(() => {
    clearStoredAuth()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isInitializing, login, logout, updateCurrentUser }),
    [user, isInitializing, login, logout, updateCurrentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다.')
  }
  return context
}
