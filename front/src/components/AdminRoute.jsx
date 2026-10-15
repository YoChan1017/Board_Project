import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function AdminRoute({ children }) {
  const { user, isInitializing } = useAuth()

  if (isInitializing) {
    return (
      <main className="page-center" aria-live="polite">
        <div className="loading-indicator" />
        <p>관리자 권한을 확인하고 있습니다.</p>
      </main>
    )
  }

  const isAdmin = ['ADMIN', 'ROLE_ADMIN'].includes(user?.role)
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return children
}
