import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function LoadingScreen() {
  return (
    <main className="page-center" aria-live="polite">
      <div className="loading-indicator" />
      <p>로그인 상태를 확인하고 있습니다.</p>
    </main>
  )
}

export function GuestRoute() {
  const { user, isInitializing } = useAuth()

  if (isInitializing) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

export function ProtectedRoute() {
  const { user, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) return <LoadingScreen />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
