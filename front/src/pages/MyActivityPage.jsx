import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState } from '../components/FeedbackState'
import { useAuth } from '../auth/AuthContext'
import {
  clearRecentPostHistory,
  getRecentPostHistoryKey,
  readRecentPostHistory,
  removeRecentPostHistoryEntry,
} from '../utils/recentPostHistory'

function formatDate(value) {
  if (!value) return '시간 정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '시간 정보 없음'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function formatCount(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

const TAB_LABELS = {
  recent: '최근 본 글',
  posts: '내 게시글',
  comments: '내 댓글',
}

export default function MyActivityPage() {
  const { user } = useAuth()
  const userId = user?.userId
  const username = user?.username
  const [activeSection, setActiveSection] = useState('recent')
  const [history, setHistory] = useState(() => readRecentPostHistory({ userId, username }))
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [boardNames, setBoardNames] = useState({})
  const [boardLoadWarning, setBoardLoadWarning] = useState('')
  const [activityPage, setActivityPage] = useState(0)
  const [activityPageSize, setActivityPageSize] = useState(10)
  const [myPostsPage, setMyPostsPage] = useState(null)
  const [myCommentsPage, setMyCommentsPage] = useState(null)
  const [isLoadingServerList, setIsLoadingServerList] = useState(false)
  const [serverListError, setServerListError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  const refreshHistory = useCallback(() => {
    setHistory(readRecentPostHistory({ userId, username }))
  }, [userId, username])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  useEffect(() => {
    const historyKey = getRecentPostHistoryKey({ userId, username })
    const handleStorage = (event) => {
      if (!event.key || event.key === historyKey) refreshHistory()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [refreshHistory, userId, username])

  useEffect(() => {
    let cancelled = false
    async function loadBoardNames() {
      try {
        const result = await boardApi.getBoards()
        if (cancelled) return
        const map = Object.fromEntries((Array.isArray(result) ? result : []).map((board) => [String(board.id), board.name || `게시판 #${board.id}`]))
        setBoardNames(map)
        setBoardLoadWarning('')
      } catch {
        if (!cancelled) setBoardLoadWarning('게시판 이름을 확인하지 못해 최근 본 글 일부는 게시판 번호로 표시합니다.')
      }
    }
    loadBoardNames()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (activeSection === 'recent') return undefined
    let cancelled = false

    async function loadMyActivity() {
      setIsLoadingServerList(true)
      setServerListError('')
      try {
        const params = { page: activityPage, size: activityPageSize, keyword: query }
        const result = activeSection === 'posts'
          ? await boardApi.getMyPosts(params)
          : await boardApi.getMyComments(params)
        if (cancelled) return
        if (activeSection === 'posts') setMyPostsPage(result)
        else setMyCommentsPage(result)
      } catch (requestError) {
        if (!cancelled) setServerListError(getErrorMessage(requestError, '내 활동을 불러오지 못했습니다.'))
      } finally {
        if (!cancelled) setIsLoadingServerList(false)
      }
    }

    loadMyActivity()
    return () => { cancelled = true }
  }, [activeSection, activityPage, activityPageSize, query, reloadVersion])

  const filteredHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    if (!normalizedQuery) return history
    return history.filter((entry) => [
      entry.title,
      entry.authorNickname,
      entry.categoryName,
      boardNames[entry.boardId],
    ].filter(Boolean).some((value) => String(value).toLocaleLowerCase('ko-KR').includes(normalizedQuery)))
  }, [history, query, boardNames])

  const activeServerPage = activeSection === 'posts' ? myPostsPage : myCommentsPage
  const serverItems = Array.isArray(activeServerPage?.content) ? activeServerPage.content : []
  const serverTotalPages = Math.max(1, Number(activeServerPage?.totalPages ?? 0))
  const serverTotalElements = Number(activeServerPage?.totalElements ?? 0)

  function handleSearch(event) {
    event.preventDefault()
    setActivityPage(0)
    setQuery(queryInput.trim())
  }

  function clearSearch() {
    setQueryInput('')
    setQuery('')
    setActivityPage(0)
  }

  function handleTabChange(nextSection) {
    if (nextSection === activeSection) return
    setActiveSection(nextSection)
    setActivityPage(0)
    setServerListError('')
  }

  function handleRemove(postId) {
    setHistory(removeRecentPostHistoryEntry({ userId, username }, postId))
  }

  function handleClear() {
    if (history.length === 0) return
    if (!window.confirm('이 계정의 최근 본 게시글 기록을 모두 지울까요?')) return
    clearRecentPostHistory({ userId, username })
    setHistory([])
    clearSearch()
  }

  return (
    <main className="my-activity-page">
      <section className="my-activity-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> MY WORKSPACE</span>
        <h1>내 활동</h1>
        <p>최근에 본 게시글과 내가 작성한 게시글·댓글을 한 곳에서 확인합니다.</p>
      </section>

      <section className="my-activity-summary" aria-label="내 활동 요약">
        <article className="my-activity-stat">
          <span className="my-activity-stat-icon" aria-hidden="true">◷</span>
          <div><span>최근 본 게시글</span><strong>{formatCount(history.length)}</strong><small>현재 브라우저에 최대 30개 저장</small></div>
        </article>
        <article className="my-activity-stat">
          <span className="my-activity-stat-icon my-activity-stat-icon-green" aria-hidden="true">▤</span>
          <div><span>내 게시글</span><strong>{myPostsPage ? formatCount(myPostsPage.totalElements) : '—'}</strong><small>{myPostsPage ? '현재 검색 조건 기준' : '탭을 열면 서버에서 조회'}</small></div>
        </article>
        <article className="my-activity-stat">
          <span className="my-activity-stat-icon my-activity-stat-icon-blue" aria-hidden="true">☷</span>
          <div><span>내 댓글</span><strong>{myCommentsPage ? formatCount(myCommentsPage.totalElements) : '—'}</strong><small>{myCommentsPage ? '현재 검색 조건 기준' : '탭을 열면 서버에서 조회'}</small></div>
        </article>
      </section>

      {boardLoadWarning && activeSection === 'recent' && <p className="my-activity-warning" role="status">{boardLoadWarning}</p>}

      <section className="my-activity-panel" aria-labelledby="my-activity-list-title">
        <div className="my-activity-panel-heading">
          <div>
            <span className="panel-kicker">MY ACTIVITY</span>
            <h2 id="my-activity-list-title">{TAB_LABELS[activeSection]}</h2>
            <p>{activeSection === 'recent' ? '이 브라우저에서 최근 방문한 게시글 기록입니다.' : '로그인한 계정으로 작성한 활성 게시글과 댓글을 최신순으로 표시합니다.'}</p>
          </div>
          {activeSection === 'recent' && <button type="button" className="button button-secondary button-small" onClick={handleClear} disabled={history.length === 0}>기록 전체 삭제</button>}
        </div>

        <div className="my-activity-tabs" role="tablist" aria-label="내 활동 종류">
          {Object.entries(TAB_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`my-activity-tab-${key}`}
              aria-selected={activeSection === key}
              aria-controls={`my-activity-panel-${key}`}
              className={`my-activity-tab${activeSection === key ? ' is-active' : ''}`}
              onClick={() => handleTabChange(key)}
            >{label}</button>
          ))}
        </div>

        <form className="my-activity-search" onSubmit={handleSearch} role="search">
          <label className="visually-hidden" htmlFor="my-activity-query">내 활동 검색</label>
          <input
            id="my-activity-query"
            type="search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder={activeSection === 'recent' ? '제목, 작성자, 게시판, 카테고리 검색' : activeSection === 'posts' ? '내 게시글의 제목 또는 본문 검색' : '내 댓글 내용 또는 게시글 제목 검색'}
            maxLength={200}
            aria-describedby="my-activity-search-help"
          />
          <span id="my-activity-search-help" className="visually-hidden">{activeSection === 'recent' ? '브라우저에 저장된 최근 본 기록을 검색합니다.' : '서버에서 로그인한 계정의 활동만 검색합니다.'}</span>
          <button type="submit" className="button button-primary button-small">검색</button>
          {(query || queryInput) && <button type="button" className="button button-secondary button-small" onClick={clearSearch}>초기화</button>}
          {activeSection !== 'recent' && (
            <label className="my-activity-page-size">
              <span>페이지당</span>
              <select value={activityPageSize} onChange={(event) => { setActivityPageSize(Number(event.target.value)); setActivityPage(0) }} disabled={isLoadingServerList}>
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={50}>50개</option>
              </select>
            </label>
          )}
        </form>

        {activeSection === 'recent' && (
          <div id="my-activity-panel-recent" role="tabpanel" aria-labelledby="my-activity-tab-recent">
            {history.length === 0 ? (
              <EmptyState className="my-activity-empty" icon="◷" title="아직 기록된 게시글이 없습니다." description="게시글 상세 화면을 방문하면 이곳에 최근 본 글이 저장됩니다.">
                <Link to="/boards" className="button button-primary button-small">게시판 둘러보기</Link>
              </EmptyState>
            ) : filteredHistory.length === 0 ? (
              <EmptyState className="my-activity-empty" icon="⌕" title="검색 결과가 없습니다." description="다른 검색어를 입력하거나 검색어를 초기화해 보세요.">
                <button type="button" className="button button-secondary button-small" onClick={clearSearch}>검색 초기화</button>
              </EmptyState>
            ) : (
              <ul className="my-activity-list">
                {filteredHistory.map((entry) => (
                  <li className="my-activity-item" key={entry.postId}>
                    <div className="my-activity-item-main">
                      <div className="my-activity-item-labels">
                        <span className="my-activity-board-label">{boardNames[entry.boardId] || (entry.boardId ? `게시판 #${entry.boardId}` : '게시판 정보 없음')}</span>
                        {entry.categoryName && <span className="category-tag">{entry.categoryName}</span>}
                      </div>
                      <Link to={`/posts/${entry.postId}`} className="my-activity-post-title">{entry.title}</Link>
                      <div className="my-activity-meta">
                        <span>작성자 {entry.authorNickname || '알 수 없음'}</span>
                        <time dateTime={entry.viewedAt || undefined}>최근 방문 {formatDate(entry.viewedAt)}</time>
                      </div>
                    </div>
                    <div className="my-activity-actions">
                      <Link to={`/posts/${entry.postId}`} className="button button-primary button-small">다시 보기</Link>
                      <button type="button" className="button button-secondary button-small" onClick={() => handleRemove(entry.postId)}>기록 삭제</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {history.length > 0 && <p className="my-activity-storage-note">최근 본 기록은 서버가 아니라 현재 브라우저의 계정별 로컬 저장소에 보관됩니다. 브라우저 데이터 삭제 시 함께 사라집니다.</p>}
          </div>
        )}

        {activeSection === 'posts' && (
          <div id="my-activity-panel-posts" role="tabpanel" aria-labelledby="my-activity-tab-posts" aria-busy={isLoadingServerList}>
            {isLoadingServerList ? (
              <LoadingState className="my-activity-empty">내 게시글을 불러오는 중입니다...</LoadingState>
            ) : serverListError ? (
              <ErrorMessage className="my-activity-server-error" actionLabel="다시 불러오기" onAction={() => setReloadVersion((value) => value + 1)}>{serverListError}</ErrorMessage>
            ) : serverItems.length === 0 ? (
              <EmptyState className="my-activity-empty" icon="▤" title={query ? '검색 결과가 없습니다.' : '작성한 게시글이 없습니다.'} description={query ? '검색어를 바꾸거나 초기화해 보세요.' : '게시판에서 첫 게시글을 작성해 보세요.'}>
                {query ? <button type="button" className="button button-secondary button-small" onClick={clearSearch}>검색 초기화</button> : <Link to="/boards" className="button button-primary button-small">게시판 둘러보기</Link>}
              </EmptyState>
            ) : (
              <>
                <p className="my-activity-server-summary" aria-live="polite">총 {formatCount(activeServerPage?.totalElements)}개 · 최신 작성순</p>
                <ul className="my-activity-list">
                  {serverItems.map((post) => (
                    <li className="my-activity-item" key={post.id}>
                      <div className="my-activity-item-main">
                        <div className="my-activity-item-labels">
                          <span className="my-activity-board-label">{post.boardName || (post.boardId ? `게시판 #${post.boardId}` : '게시판 정보 없음')}</span>
                          {post.categoryName && <span className="category-tag">{post.categoryName}</span>}
                        </div>
                        <Link to={`/posts/${post.id}`} className="my-activity-post-title">{post.title || '제목 없는 게시글'}</Link>
                        <div className="my-activity-meta">
                          <time dateTime={post.createdAt || undefined}>작성 {formatDate(post.createdAt)}</time>
                          <span>조회 {formatCount(post.viewCount)}</span>
                          <span>좋아요 {formatCount(post.likeCount)}</span>
                        </div>
                      </div>
                      <div className="my-activity-actions">
                        <Link to={`/posts/${post.id}`} className="button button-primary button-small">열기</Link>
                        <Link to={`/posts/${post.id}/edit`} className="button button-secondary button-small">수정</Link>
                      </div>
                    </li>
                  ))}
                </ul>
                <nav className="my-activity-pagination" aria-label="내 게시글 페이지">
                  <button type="button" className="button button-secondary button-small" disabled={activityPage <= 0 || isLoadingServerList} onClick={() => setActivityPage((value) => Math.max(0, value - 1))}>이전</button>
                  <span aria-live="polite">{activityPage + 1} / {serverTotalPages} 페이지</span>
                  <button type="button" className="button button-secondary button-small" disabled={activityPage + 1 >= serverTotalPages || isLoadingServerList} onClick={() => setActivityPage((value) => value + 1)}>다음</button>
                </nav>
              </>
            )}
          </div>
        )}

        {activeSection === 'comments' && (
          <div id="my-activity-panel-comments" role="tabpanel" aria-labelledby="my-activity-tab-comments" aria-busy={isLoadingServerList}>
            {isLoadingServerList ? (
              <LoadingState className="my-activity-empty">내 댓글을 불러오는 중입니다...</LoadingState>
            ) : serverListError ? (
              <ErrorMessage className="my-activity-server-error" actionLabel="다시 불러오기" onAction={() => setReloadVersion((value) => value + 1)}>{serverListError}</ErrorMessage>
            ) : serverItems.length === 0 ? (
              <EmptyState className="my-activity-empty" icon="☷" title={query ? '검색 결과가 없습니다.' : '작성한 댓글이 없습니다.'} description={query ? '댓글 내용이나 게시글 제목으로 다시 검색해 보세요.' : '게시글에서 댓글을 작성하면 이곳에 표시됩니다.'}>
                {query ? <button type="button" className="button button-secondary button-small" onClick={clearSearch}>검색 초기화</button> : <Link to="/boards" className="button button-primary button-small">게시글 둘러보기</Link>}
              </EmptyState>
            ) : (
              <>
                <p className="my-activity-server-summary" aria-live="polite">총 {formatCount(activeServerPage?.totalElements)}개 · 최신 작성순</p>
                <ul className="my-activity-list">
                  {serverItems.map((comment) => (
                    <li className="my-activity-item my-activity-comment-item" key={comment.id}>
                      <div className="my-activity-item-main">
                        <div className="my-activity-item-labels">
                          <span className="my-activity-board-label">{comment.boardName || (comment.boardId ? `게시판 #${comment.boardId}` : '게시판 정보 없음')}</span>
                          {comment.categoryName && <span className="category-tag">{comment.categoryName}</span>}
                          {comment.parentId != null && <span className="my-activity-reply-label">대댓글</span>}
                        </div>
                        <Link to={`/posts/${comment.postId}`} className="my-activity-comment-post">게시글: {comment.postTitle || '제목 없는 게시글'}</Link>
                        <p className="my-activity-comment-content">{comment.content}</p>
                        <div className="my-activity-meta">
                          <time dateTime={comment.createdAt || undefined}>작성 {formatDate(comment.createdAt)}</time>
                          {comment.updatedAt && comment.updatedAt !== comment.createdAt && <time dateTime={comment.updatedAt}>수정 {formatDate(comment.updatedAt)}</time>}
                        </div>
                      </div>
                      <div className="my-activity-actions">
                        <Link to={`/posts/${comment.postId}`} className="button button-primary button-small">게시글 열기</Link>
                      </div>
                    </li>
                  ))}
                </ul>
                <nav className="my-activity-pagination" aria-label="내 댓글 페이지">
                  <button type="button" className="button button-secondary button-small" disabled={activityPage <= 0 || isLoadingServerList} onClick={() => setActivityPage((value) => Math.max(0, value - 1))}>이전</button>
                  <span aria-live="polite">{activityPage + 1} / {serverTotalPages} 페이지</span>
                  <button type="button" className="button button-secondary button-small" disabled={activityPage + 1 >= serverTotalPages || isLoadingServerList} onClick={() => setActivityPage((value) => value + 1)}>다음</button>
                </nav>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
