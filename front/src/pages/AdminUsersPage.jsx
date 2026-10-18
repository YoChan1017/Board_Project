import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminUserApi } from '../api/adminUserApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState } from '../components/FeedbackState'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function roleLabel(role) {
  return ['ADMIN', 'ROLE_ADMIN'].includes(role) ? '관리자' : '일반 회원'
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await adminUserApi.getUsers()
      setUsers(Array.isArray(result) ? result : [])
    } catch (requestError) {
      setError(getErrorMessage(requestError, '회원 목록을 불러오지 못했습니다. 관리자 계정인지 확인해 주세요.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const filteredUsers = useMemo(() => users.filter((user) => {
    const isWithdrawn = Boolean(user.deletedAt)
    if (statusFilter === 'active' && isWithdrawn) return false
    if (statusFilter === 'withdrawn' && !isWithdrawn) return false
    if (roleFilter === 'admin' && !['ADMIN', 'ROLE_ADMIN'].includes(user.role)) return false
    if (roleFilter === 'user' && ['ADMIN', 'ROLE_ADMIN'].includes(user.role)) return false
    if (!normalizedQuery) return true
    return [user.username, user.nickname, user.email, String(user.userId ?? user.id ?? '')]
      .some((value) => String(value ?? '').toLocaleLowerCase('ko-KR').includes(normalizedQuery))
  }), [users, statusFilter, roleFilter, normalizedQuery])

  const activeCount = users.filter((user) => !user.deletedAt).length
  const withdrawnCount = users.length - activeCount

  return (
    <main className="admin-users-page">
      <section className="admin-users-heading">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> ADMINISTRATION</span>
          <h1>회원 관리</h1>
          <p>회원 정보와 계정 상태를 확인합니다. 비밀번호 및 인증 토큰 정보는 노출하지 않습니다.</p>
        </div>
        <Link className="button button-secondary" to="/admin/boards">게시판 관리</Link>
      </section>

      <section className="admin-users-stats" aria-label="회원 수 요약">
        <article><span>전체 계정</span><strong>{users.length}</strong></article>
        <article><span>활성 계정</span><strong>{activeCount}</strong></article>
        <article><span>탈퇴 계정</span><strong>{withdrawnCount}</strong></article>
      </section>

      {error && <ErrorMessage className="admin-users-feedback" actionLabel="다시 불러오기" onAction={loadUsers}>{error}</ErrorMessage>}

      <section className="admin-users-panel" aria-labelledby="admin-users-list-title">
        <div className="admin-users-panel-heading">
          <div><h2 id="admin-users-list-title">회원 목록</h2><p>{filteredUsers.length}명 표시 중</p></div>
          <button type="button" className="button button-secondary button-small" onClick={loadUsers} disabled={isLoading}>새로고침</button>
        </div>

        <div className="admin-users-filters">
          <div className="admin-users-filter-field admin-users-search-field">
            <label htmlFor="admin-users-query">회원 검색</label>
            <input id="admin-users-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="아이디, 닉네임, 이메일, 사용자 ID" />
          </div>
          <div className="admin-users-filter-field">
            <label htmlFor="admin-users-role">권한</label>
            <select id="admin-users-role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">전체 권한</option><option value="admin">관리자</option><option value="user">일반 회원</option>
            </select>
          </div>
          <div className="admin-users-filter-field">
            <label htmlFor="admin-users-status">계정 상태</label>
            <select id="admin-users-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="active">활성 계정</option><option value="withdrawn">탈퇴 계정</option><option value="all">전체 상태</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingState className="admin-users-state">회원 목록을 불러오는 중입니다...</LoadingState>
        ) : filteredUsers.length === 0 ? (
          <EmptyState className="admin-users-state" title="조건에 맞는 회원이 없습니다.">검색어 또는 필터를 변경해 보세요.</EmptyState>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead><tr><th scope="col">ID</th><th scope="col">아이디</th><th scope="col">닉네임</th><th scope="col">이메일</th><th scope="col">권한</th><th scope="col">상태</th><th scope="col">가입일</th></tr></thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isWithdrawn = Boolean(user.deletedAt)
                  return (
                    <tr key={user.userId ?? user.id} className={isWithdrawn ? 'is-withdrawn' : ''}>
                      <td data-label="ID">{user.userId ?? user.id}</td>
                      <td data-label="아이디">{user.username || '-'}</td>
                      <td data-label="닉네임">{user.nickname || '-'}</td>
                      <td data-label="이메일">{user.email || '-'}</td>
                      <td data-label="권한"><span className={`admin-users-role ${['ADMIN', 'ROLE_ADMIN'].includes(user.role) ? 'is-admin' : ''}`}>{roleLabel(user.role)}</span></td>
                      <td data-label="상태"><span className={`admin-users-status ${isWithdrawn ? 'is-withdrawn' : 'is-active'}`}>{isWithdrawn ? '탈퇴' : '활성'}</span></td>
                      <td data-label="가입일">{formatDate(user.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
