import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState, SuccessMessage } from '../components/FeedbackState'

const PAGE_SIZE = 10

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function AdminPostManagementPage() {
  const [boards, setBoards] = useState([])
  const [selectedBoardId, setSelectedBoardId] = useState('')
  const [postsPage, setPostsPage] = useState(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [busyPostId, setBusyPostId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedBoard = boards.find((board) => String(board.id) === selectedBoardId) ?? null
  const posts = postsPage?.content ?? []
  const totalElements = postsPage?.totalElements ?? 0
  const totalPages = postsPage?.totalPages ?? 0

  const loadBoards = useCallback(async () => {
    setIsLoadingBoards(true)
    setError('')
    try {
      const result = await boardApi.getBoards()
      const safeBoards = Array.isArray(result) ? result : []
      setBoards(safeBoards)
      setSelectedBoardId((current) => {
        if (current && safeBoards.some((board) => String(board.id) === current)) return current
        return safeBoards.length ? String(safeBoards[0].id) : ''
      })
    } catch (requestError) {
      setError(getErrorMessage(requestError, '게시판 목록을 불러오지 못했습니다.'))
    } finally {
      setIsLoadingBoards(false)
    }
  }, [])

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  useEffect(() => {
    if (!selectedBoardId) {
      setPostsPage(null)
      setIsLoadingPosts(false)
      return undefined
    }

    let cancelled = false
    async function loadPosts() {
      setIsLoadingPosts(true)
      setError('')
      try {
        const result = await boardApi.getPosts(selectedBoardId, {
          page,
          size: PAGE_SIZE,
          keyword,
        })
        if (!cancelled) setPostsPage(result)
      } catch (requestError) {
        if (!cancelled) {
          setPostsPage(null)
          setError(getErrorMessage(requestError, '게시글 목록을 불러오지 못했습니다.'))
        }
      } finally {
        if (!cancelled) setIsLoadingPosts(false)
      }
    }

    loadPosts()
    return () => { cancelled = true }
  }, [selectedBoardId, page, keyword, reloadKey])

  function handleSearch(event) {
    event.preventDefault()
    setPage(0)
    setKeyword(keywordInput.trim())
    setNotice('')
  }

  function handleBoardChange(event) {
    setSelectedBoardId(event.target.value)
    setPage(0)
    setKeywordInput('')
    setKeyword('')
    setNotice('')
    setError('')
  }

  async function handleDelete(post) {
    const confirmed = window.confirm(
      `“${post.title}” 게시글을 삭제할까요? 삭제 후 일반 게시글 목록에서 숨겨집니다.`,
    )
    if (!confirmed) return

    setBusyPostId(post.id)
    setError('')
    setNotice('')
    try {
      await boardApi.deletePost(post.id)
      setNotice('게시글을 삭제했습니다.')
      if (posts.length === 1 && page > 0) {
        setPage((current) => Math.max(0, current - 1))
      } else {
        setReloadKey((current) => current + 1)
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, '게시글 삭제에 실패했습니다.'))
    } finally {
      setBusyPostId(null)
    }
  }

  return (
    <main className="admin-post-page">
      <section className="admin-post-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> ADMINISTRATION</span>
        <h1>게시글 관리</h1>
        <p>게시판별 게시글을 검색하고 상세 내용을 확인하거나 부적절한 게시글을 관리합니다.</p>
      </section>

      {error && (
        <ErrorMessage
          className="boards-alert admin-post-feedback"
          actionLabel={selectedBoardId ? '게시글 다시 불러오기' : '게시판 다시 불러오기'}
          onAction={selectedBoardId ? () => setReloadKey((current) => current + 1) : loadBoards}
        >
          {error}
        </ErrorMessage>
      )}
      {notice && <SuccessMessage className="admin-post-notice" as="p">{notice}</SuccessMessage>}

      <section className="admin-post-panel" aria-labelledby="admin-post-list-heading">
        <div className="admin-post-panel-heading">
          <div>
            <span className="panel-kicker">POST MODERATION</span>
            <h2 id="admin-post-list-heading">게시글 목록</h2>
            <p>목록은 최신 작성순이며, 검색은 선택한 게시판 안에서 동작합니다.</p>
          </div>
          <Link to="/admin/boards" className="button button-secondary button-small">게시판 관리</Link>
        </div>

        <div className="admin-post-filters">
          <label htmlFor="admin-post-board">대상 게시판</label>
          {isLoadingBoards ? (
            <LoadingState className="admin-post-inline-state">게시판 목록을 불러오는 중입니다...</LoadingState>
          ) : boards.length === 0 ? (
            <div className="admin-post-inline-state">등록된 게시판이 없습니다. 먼저 게시판을 추가해 주세요.</div>
          ) : (
            <select id="admin-post-board" value={selectedBoardId} onChange={handleBoardChange}>
              {boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
            </select>
          )}

          <form className="admin-post-search" onSubmit={handleSearch}>
            <label className="visually-hidden" htmlFor="admin-post-keyword">게시글 검색어</label>
            <input
              id="admin-post-keyword"
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="제목 또는 내용 검색"
              disabled={!selectedBoardId || isLoadingBoards}
            />
            <button type="submit" className="button button-primary button-small" disabled={!selectedBoardId || isLoadingPosts}>검색</button>
            {(keyword || keywordInput) && (
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => { setKeywordInput(''); setKeyword(''); setPage(0); setNotice('') }}
              >
                초기화
              </button>
            )}
          </form>
        </div>

        <div className="admin-post-results-heading">
          <div>
            <strong>{selectedBoard?.name ?? '선택된 게시판 없음'}</strong>
            <span>{keyword ? `“${keyword}” 검색 결과` : '게시판의 전체 게시글'}</span>
          </div>
          <span className="admin-post-count">{totalElements.toLocaleString('ko-KR')}개</span>
        </div>

        {isLoadingPosts ? (
          <LoadingState className="boards-state">게시글을 불러오는 중입니다...</LoadingState>
        ) : !selectedBoardId ? (
          <EmptyState className="admin-post-empty" title="게시판을 선택해 주세요." />
        ) : posts.length === 0 ? (
          <EmptyState
            className="admin-post-empty"
            icon="▤"
            title={keyword ? '검색 결과가 없습니다.' : '등록된 게시글이 없습니다.'}
            description={keyword ? '검색어를 변경하거나 초기화해 보세요.' : '선택한 게시판에 게시글이 작성되면 여기에 표시됩니다.'}
          />
        ) : (
          <>
            <div className="admin-post-table-wrap">
              <table className="admin-post-table">
                <thead>
                  <tr>
                    <th scope="col">게시글</th>
                    <th scope="col">작성자</th>
                    <th scope="col">조회</th>
                    <th scope="col">좋아요</th>
                    <th scope="col">작성일</th>
                    <th scope="col">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <div className="admin-post-title-cell">
                          {post.categoryName && <span className="category-inline">{post.categoryName}</span>}
                          <Link to={`/posts/${post.id}`} className="admin-post-title-link">{post.title}</Link>
                        </div>
                      </td>
                      <td>{post.authorNickname || '-'}</td>
                      <td>{(post.viewCount ?? 0).toLocaleString('ko-KR')}</td>
                      <td>{(post.likeCount ?? 0).toLocaleString('ko-KR')}</td>
                      <td>{formatDate(post.createdAt)}</td>
                      <td>
                        <div className="admin-post-row-actions">
                          <Link to={`/posts/${post.id}`} className="admin-post-action">상세</Link>
                          <button
                            type="button"
                            className="admin-post-action admin-post-action-danger"
                            onClick={() => handleDelete(post)}
                            disabled={busyPostId !== null}
                          >
                            {String(busyPostId) === String(post.id) ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav className="admin-post-pagination" aria-label="관리자 게시글 페이지">
              <button type="button" className="button button-secondary button-small" disabled={page <= 0 || isLoadingPosts} onClick={() => setPage((current) => Math.max(0, current - 1))}>이전</button>
              <span>{page + 1} / {Math.max(totalPages, 1)}</span>
              <button type="button" className="button button-secondary button-small" disabled={page + 1 >= totalPages || isLoadingPosts} onClick={() => setPage((current) => current + 1)}>다음</button>
            </nav>
          </>
        )}
      </section>

      <div className="admin-post-footer">
        <Link to="/boards" className="text-link">일반 게시판 보기 →</Link>
      </div>
    </main>
  )
}
