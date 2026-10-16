import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { EmptyState, ErrorMessage } from '../components/FeedbackState'
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

export default function MyActivityPage() {
  const { user } = useAuth()
  const userId = user?.userId
  const username = user?.username
  const [history, setHistory] = useState(() => readRecentPostHistory({ userId, username }))
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [boardNames, setBoardNames] = useState({})
  const [boardLoadWarning, setBoardLoadWarning] = useState('')

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
        if (!cancelled) setBoardLoadWarning('게시판 이름을 확인하지 못해 일부 항목은 게시판 번호로 표시합니다.')
      }
    }
    loadBoardNames()
    return () => { cancelled = true }
  }, [])

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

  function handleSearch(event) {
    event.preventDefault()
    setQuery(queryInput.trim())
  }

  function handleRemove(postId) {
    setHistory(removeRecentPostHistoryEntry({ userId, username }, postId))
  }

  function handleClear() {
    if (history.length === 0) return
    if (!window.confirm('이 계정의 최근 본 게시글 기록을 모두 지울까요?')) return
    clearRecentPostHistory({ userId, username })
    setHistory([])
    setQueryInput('')
    setQuery('')
  }

  return (
    <main className="my-activity-page">
      <section className="my-activity-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> MY WORKSPACE</span>
        <h1>내 활동</h1>
        <p>이 브라우저에서 최근에 열어 본 게시글을 확인하고 다시 방문할 수 있습니다.</p>
      </section>

      <section className="my-activity-summary" aria-label="최근 본 게시글 요약">
        <article className="my-activity-stat">
          <span className="my-activity-stat-icon" aria-hidden="true">◷</span>
          <div><span>최근 본 게시글</span><strong>{history.length.toLocaleString('ko-KR')}</strong><small>최대 30개까지 저장</small></div>
        </article>
        <article className="my-activity-stat">
          <span className="my-activity-stat-icon my-activity-stat-icon-green" aria-hidden="true">▤</span>
          <div><span>방문한 게시판</span><strong>{new Set(history.map((entry) => entry.boardId).filter(Boolean)).size.toLocaleString('ko-KR')}</strong><small>기록에 남은 게시판 기준</small></div>
        </article>
      </section>

      {boardLoadWarning && <p className="my-activity-warning" role="status">{boardLoadWarning}</p>}

      <section className="my-activity-panel" aria-labelledby="my-activity-list-title">
        <div className="my-activity-panel-heading">
          <div>
            <span className="panel-kicker">RECENTLY VIEWED</span>
            <h2 id="my-activity-list-title">최근 본 게시글</h2>
            <p>가장 최근에 방문한 게시글부터 표시합니다.</p>
          </div>
          <button type="button" className="button button-secondary button-small" onClick={handleClear} disabled={history.length === 0}>기록 전체 삭제</button>
        </div>

        <form className="my-activity-search" onSubmit={handleSearch} role="search">
          <label className="visually-hidden" htmlFor="my-activity-query">최근 본 게시글 검색</label>
          <input
            id="my-activity-query"
            type="search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="제목, 작성자, 게시판, 카테고리 검색"
            aria-describedby="my-activity-search-help"
          />
          <span id="my-activity-search-help" className="visually-hidden">현재 브라우저에 저장된 최근 본 게시글만 검색합니다.</span>
          <button type="submit" className="button button-primary button-small">검색</button>
          {(query || queryInput) && <button type="button" className="button button-secondary button-small" onClick={() => { setQueryInput(''); setQuery('') }}>초기화</button>}
        </form>

        {history.length === 0 ? (
          <EmptyState
            className="my-activity-empty"
            icon="◷"
            title="아직 기록된 게시글이 없습니다."
            description="게시글 상세 화면을 방문하면 이곳에 최근 본 글이 저장됩니다."
          >
            <Link to="/boards" className="button button-primary button-small">게시판 둘러보기</Link>
          </EmptyState>
        ) : filteredHistory.length === 0 ? (
          <EmptyState className="my-activity-empty" icon="⌕" title="검색 결과가 없습니다." description="다른 검색어를 입력하거나 검색어를 초기화해 보세요.">
            <button type="button" className="button button-secondary button-small" onClick={() => { setQueryInput(''); setQuery('') }}>검색 초기화</button>
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

        {history.length > 0 && <p className="my-activity-storage-note">이 기록은 서버가 아니라 현재 브라우저의 계정별 로컬 저장소에 보관됩니다. 브라우저 데이터 삭제 시 함께 사라집니다.</p>}
      </section>
    </main>
  )
}
