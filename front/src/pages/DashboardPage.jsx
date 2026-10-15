import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ErrorMessage, LoadingState } from '../components/FeedbackState'

const RECENT_POSTS_PER_BOARD = 3
const RECENT_POSTS_LIMIT = 6

function isAdmin(user) {
  return ['ADMIN', 'ROLE_ADMIN'].includes(user?.role)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getPostTimestamp(post) {
  const value = new Date(post.createdAt ?? 0).getTime()
  return Number.isNaN(value) ? 0 : value
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [boards, setBoards] = useState([])
  const [recentPosts, setRecentPosts] = useState([])
  const [totalPostCount, setTotalPostCount] = useState(0)
  const [failedBoardRequests, setFailedBoardRequests] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError('')
    setFailedBoardRequests(0)

    try {
      const boardData = await boardApi.getBoards()
      const safeBoards = Array.isArray(boardData) ? boardData : []
      setBoards(safeBoards)

      if (safeBoards.length === 0) {
        setRecentPosts([])
        setTotalPostCount(0)
        return
      }

      // The API exposes posts per board, so collect a small first page from each board.
      const results = await Promise.allSettled(
        safeBoards.map(async (board) => ({
          board,
          page: await boardApi.getPosts(board.id, {
            page: 0,
            size: RECENT_POSTS_PER_BOARD,
          }),
        })),
      )

      const failedCount = results.filter((result) => result.status === 'rejected').length
      setFailedBoardRequests(failedCount)

      const successfulPages = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)

      const postCount = successfulPages.reduce((sum, item) => {
        const count = Number(item.page?.totalElements)
        return sum + (Number.isFinite(count) && count > 0 ? count : 0)
      }, 0)

      const posts = successfulPages.flatMap(({ board, page }) => {
        const content = Array.isArray(page?.content) ? page.content : []
        return content.map((post) => ({
          ...post,
          dashboardBoardId: board.id,
          dashboardBoardName: board.name || '게시판',
        }))
      })

      posts.sort((left, right) => getPostTimestamp(right) - getPostTimestamp(left))
      setRecentPosts(posts.slice(0, RECENT_POSTS_LIMIT))
      setTotalPostCount(postCount)
    } catch (requestError) {
      setError(getErrorMessage(requestError, '대시보드 정보를 불러오지 못했습니다.'))
      setBoards([])
      setRecentPosts([])
      setTotalPostCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  return (
    <main className="dashboard-page dashboard-overview-page">
      <section className="dashboard-welcome dashboard-overview-welcome">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> PRIVATE WORKSPACE</span>
          <h1>{user?.nickname || user?.username || '사용자'}님, 환영합니다.</h1>
          <p>게시판 현황과 최근 게시글을 한 곳에서 확인하고 관심 있는 대화에 참여해 보세요.</p>
        </div>
        <button type="button" className="button button-secondary dashboard-refresh-button" onClick={loadDashboard} disabled={isLoading}>
          <span aria-hidden="true">↻</span> {isLoading ? '새로고침 중...' : '새로고침'}
        </button>
      </section>

      {error && (
        <ErrorMessage
          className="dashboard-error"
          actionLabel="다시 불러오기"
          onAction={loadDashboard}
        >
          {error}
        </ErrorMessage>
      )}

      {!error && failedBoardRequests > 0 && (
        <div className="dashboard-partial-warning" role="status">
          일부 게시판의 게시글을 불러오지 못했습니다. ({failedBoardRequests}개 게시판)
        </div>
      )}

      <section className="dashboard-stat-grid" aria-label="게시판 요약">
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon dashboard-stat-icon-purple" aria-hidden="true">▤</span>
          <div><span className="dashboard-stat-label">게시판</span><strong>{isLoading || error ? '—' : boards.length.toLocaleString('ko-KR')}</strong><small>참여 가능한 게시판</small></div>
        </article>
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon dashboard-stat-icon-green" aria-hidden="true">✎</span>
          <div><span className="dashboard-stat-label">게시글</span><strong>{isLoading || error || (boards.length > 0 && failedBoardRequests === boards.length) ? '—' : totalPostCount.toLocaleString('ko-KR')}</strong><small>게시판별 전체 게시글 합계</small></div>
        </article>
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon dashboard-stat-icon-orange" aria-hidden="true">◎</span>
          <div><span className="dashboard-stat-label">내 권한</span><strong className="dashboard-role-value">{isAdmin(user) ? '관리자' : '일반 회원'}</strong><small>{user?.username || '로그인 계정'}</small></div>
        </article>
      </section>

      <section className="dashboard-content-grid">
        <section className="dashboard-recent-panel" aria-labelledby="dashboard-recent-heading">
          <div className="dashboard-section-heading">
            <div><span className="panel-kicker">LATEST DISCUSSIONS</span><h2 id="dashboard-recent-heading">최근 게시글</h2><p>게시판별 최신 글을 모아 보여줍니다.</p></div>
            <Link to="/boards" className="text-link">전체 게시판 <span aria-hidden="true">→</span></Link>
          </div>

          {isLoading ? (
            <LoadingState className="dashboard-list-state">최근 게시글을 불러오는 중입니다...</LoadingState>
          ) : error ? (
            <EmptyState className="dashboard-list-empty" icon="!" title="게시글을 표시할 수 없습니다." description="새로고침을 눌러 다시 시도해 주세요." />
          ) : boards.length === 0 ? (
            <EmptyState className="dashboard-list-empty" icon="▤" title="등록된 게시판이 없습니다." description="관리자가 게시판을 등록하면 이곳에서 확인할 수 있습니다.">
              {isAdmin(user) && <Link to="/admin/boards" className="button button-primary button-small">게시판 관리</Link>}
            </EmptyState>
          ) : boards.length > 0 && failedBoardRequests === boards.length ? (
            <EmptyState className="dashboard-list-empty" icon="!" title="게시글을 불러오지 못했습니다." description="게시판별 게시글 조회가 모두 실패했습니다. 다시 시도해 주세요.">
              <button type="button" className="button button-secondary button-small" onClick={loadDashboard}>다시 불러오기</button>
            </EmptyState>
          ) : recentPosts.length === 0 ? (
            <EmptyState className="dashboard-list-empty" icon="✎" title="아직 게시글이 없습니다." description="관심 있는 게시판에서 첫 글을 작성해 보세요.">
              <Link to="/boards" className="button button-primary button-small">게시판 둘러보기</Link>
            </EmptyState>
          ) : (
            <ul className="dashboard-recent-list">
              {recentPosts.map((post) => (
                <li key={`${post.dashboardBoardId}-${post.id}`} className="dashboard-recent-item">
                  <Link to={`/posts/${post.id}`} className="dashboard-recent-post-link">
                    <span className="dashboard-recent-board">{post.dashboardBoardName}{post.categoryName ? ` · ${post.categoryName}` : ''}</span>
                    <strong>{post.title || '제목 없는 게시글'}</strong>
                    <span className="dashboard-recent-meta">
                      <span>{post.authorNickname || '알 수 없는 사용자'}</span>
                      <time dateTime={post.createdAt || undefined}>{formatDate(post.createdAt)}</time>
                    </span>
                  </Link>
                  <span className="dashboard-recent-counts" aria-label={`조회 ${post.viewCount ?? 0}, 좋아요 ${post.likeCount ?? 0}`}>
                    <span>조회 {post.viewCount ?? 0}</span><span>♥ {post.likeCount ?? 0}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="dashboard-shortcuts" aria-labelledby="dashboard-shortcuts-heading">
          <div><span className="panel-kicker">QUICK ACCESS</span><h2 id="dashboard-shortcuts-heading">빠른 이동</h2><p>자주 사용하는 메뉴로 바로 이동하세요.</p></div>
          <Link to="/boards" className="dashboard-shortcut-link"><span className="dashboard-shortcut-symbol">▤</span><span><strong>게시판 둘러보기</strong><small>글 목록과 검색 확인</small></span><span className="dashboard-shortcut-arrow" aria-hidden="true">→</span></Link>
          <Link to="/boards" className="dashboard-shortcut-link"><span className="dashboard-shortcut-symbol">＋</span><span><strong>새 게시글 작성</strong><small>게시판을 선택하고 글쓰기</small></span><span className="dashboard-shortcut-arrow" aria-hidden="true">→</span></Link>
          {isAdmin(user) && <Link to="/admin/boards" className="dashboard-shortcut-link"><span className="dashboard-shortcut-symbol">⚙</span><span><strong>게시판 관리</strong><small>게시판과 카테고리 설정</small></span><span className="dashboard-shortcut-arrow" aria-hidden="true">→</span></Link>}
          {isAdmin(user) && <Link to="/admin/posts" className="dashboard-shortcut-link"><span className="dashboard-shortcut-symbol">☷</span><span><strong>게시글 관리</strong><small>게시글 검색 및 관리</small></span><span className="dashboard-shortcut-arrow" aria-hidden="true">→</span></Link>}
        </aside>
      </section>

      <section className="account-panel dashboard-account-panel" aria-labelledby="account-title">
        <div className="account-panel-heading">
          <div><span className="panel-kicker">ACCOUNT</span><h2 id="account-title">내 계정</h2></div>
          <span className="status-pill"><span /> 인증됨</span>
        </div>
        <dl className="account-details">
          <div><dt>아이디</dt><dd>{user?.username || '-'}</dd></div>
          <div><dt>닉네임</dt><dd>{user?.nickname || '-'}</dd></div>
          <div><dt>권한</dt><dd>{user?.role || 'USER'}</dd></div>
          <div><dt>사용자 ID</dt><dd>{user?.userId ?? '-'}</dd></div>
        </dl>
      </section>
    </main>
  )
}
