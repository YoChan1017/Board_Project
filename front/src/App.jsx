import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import AdminRoute from './components/AdminRoute'
import AppLayout from './components/AppLayout'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards'
import AdminBoardManagementPage from './pages/AdminBoardManagementPage'
import AdminPostManagementPage from './pages/AdminPostManagementPage'
import AccountWithdrawalPage from './pages/AccountWithdrawalPage'
import BoardsPage from './pages/BoardsPage'
import DashboardPage from './pages/DashboardPage'
import GlobalSearchPage from './pages/GlobalSearchPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MyActivityPage from './pages/MyActivityPage'
import PasswordChangePage from './pages/PasswordChangePage'
import PostCreatePage from './pages/PostCreatePage'
import PostDetailPage from './pages/PostDetailPage'
import PostEditPage from './pages/PostEditPage'
import ProfilePage from './pages/ProfilePage'
import SignupPage from './pages/SignupPage'
import './App.css'

function NotFoundPage() {
  return (
    <main className="page-center not-found-page">
      <span className="eyebrow">404 · NOT FOUND</span>
      <h1>페이지를 찾을 수 없습니다.</h1>
      <p>주소를 확인하거나 홈으로 이동해 주세요.</p>
      <a href="/" className="button button-primary">홈으로 이동</a>
    </main>
  )
}

function RootRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" replace /> : <HomePage />
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/activity" element={<MyActivityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/security" element={<PasswordChangePage />} />
          <Route path="/account/withdraw" element={<AccountWithdrawalPage />} />
          <Route path="/search" element={<GlobalSearchPage />} />
          <Route path="/boards" element={<BoardsPage />} />
          <Route path="/boards/:boardId/posts/new" element={<PostCreatePage />} />
          <Route path="/posts/:postId" element={<PostDetailPage />} />
          <Route path="/posts/:postId/edit" element={<PostEditPage />} />
          <Route path="/admin/boards" element={<AdminRoute><AdminBoardManagementPage /></AdminRoute>} />
          <Route path="/admin/posts" element={<AdminRoute><AdminPostManagementPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
