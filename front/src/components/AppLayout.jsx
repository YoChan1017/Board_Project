import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function isAdmin(user) {
  return ['ADMIN', 'ROLE_ADMIN'].includes(user?.role)
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Board Project 홈">
          <span className="brand-mark">B</span>
          <span>Board<span className="brand-light">Project</span></span>
        </Link>

        <nav className="site-nav" aria-label="주요 메뉴">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>홈</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>대시보드</NavLink>
              <NavLink to="/boards" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>게시판</NavLink>
              {isAdmin(user) && <NavLink to="/admin/boards" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>게시판 관리</NavLink>}
              <span className="nav-user">{user.nickname || user.username}</span>
              <button type="button" className="button button-quiet button-small" onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>로그인</NavLink>
              <Link to="/signup" className="button button-primary button-small">회원가입</Link>
            </>
          )}
        </nav>
      </header>

      <Outlet />

      <footer className="site-footer">
        <span>Board Project</span>
        <span>Spring Boot · React · MariaDB</span>
      </footer>
    </div>
  )
}
