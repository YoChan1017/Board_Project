import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function isAdmin(user) {
  return ['ADMIN', 'ROLE_ADMIN'].includes(user?.role)
}

function navLinkClass({ isActive }) {
  return isActive ? 'nav-link active' : 'nav-link'
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Close the compact navigation after route changes, including browser navigation.
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const closeMenu = () => setIsMenuOpen(false)

  const handleLogout = () => {
    closeMenu()
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Board Project 홈" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true">B</span>
          <span>Board<span className="brand-light">Project</span></span>
        </Link>

        <button
          type="button"
          className="mobile-nav-toggle"
          aria-controls="primary-navigation"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? '주요 메뉴 닫기' : '주요 메뉴 열기'}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span className={`mobile-nav-icon${isMenuOpen ? ' is-open' : ''}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="mobile-nav-toggle-label">{isMenuOpen ? '닫기' : '메뉴'}</span>
        </button>

        <nav
          id="primary-navigation"
          className={`site-nav${isMenuOpen ? ' mobile-open' : ''}`}
          aria-label="주요 메뉴"
        >
          <NavLink to="/" end className={navLinkClass} onClick={closeMenu}>홈</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className={navLinkClass} onClick={closeMenu}>대시보드</NavLink>
              <NavLink to="/boards" className={navLinkClass} onClick={closeMenu}>게시판</NavLink>
              {isAdmin(user) && <NavLink to="/admin/boards" className={navLinkClass} onClick={closeMenu}>게시판 관리</NavLink>}
              {isAdmin(user) && <NavLink to="/admin/posts" className={navLinkClass} onClick={closeMenu}>글 관리</NavLink>}
              <span className="nav-user">{user.nickname || user.username}</span>
              <button type="button" className="button button-quiet button-small" onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass} onClick={closeMenu}>로그인</NavLink>
              <Link to="/signup" className="button button-primary button-small" onClick={closeMenu}>회원가입</Link>
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
