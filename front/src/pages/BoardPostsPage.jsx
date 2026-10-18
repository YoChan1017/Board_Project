import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState } from '../components/FeedbackState'

const PAGE_SIZE = 10

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export default function BoardPostsPage() {
  const { boardId } = useParams()
  const [board, setBoard] = useState(null)
  const [postsPage, setPostsPage] = useState(null)
  const [queryInput, setQueryInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [isLoadingBoard, setIsLoadingBoard] = useState(true)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [boardError, setBoardError] = useState('')
  const [postsError, setPostsError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const loadBoard = useCallback(async () => {
    setIsLoadingBoard(true)
    setBoardError('')
    try {
      const allBoards = await boardApi.getBoards()
      const found = (Array.isArray(allBoards) ? allBoards : []).find((item) => String(item.id) === String(boardId))
      setBoard(found ?? null)
      if (!found) setBoardError('해당 게시판을 찾을 수 없습니다.')
    } catch (requestError) {
      setBoardError(getErrorMessage(requestError, '게시판 정보를 불러오지 못했습니다.'))
      setBoard(null)
    } finally {
      setIsLoadingBoard(false)
    }
  }, [boardId])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  useEffect(() => {
    let cancelled = false
    if (isLoadingBoard) return () => { cancelled = true }
    if (!board) {
      setPostsPage(null)
      setIsLoadingPosts(false)
      return () => { cancelled = true }
    }

    async function loadPosts() {
      setIsLoadingPosts(true)
      setPostsError('')
      try {
        const result = await boardApi.getPosts(boardId, { page, size: PAGE_SIZE, keyword })
        if (!cancelled) setPostsPage(result)
      } catch (requestError) {
        if (!cancelled) {
          setPostsPage(null)
          setPostsError(getErrorMessage(requestError, '게시글 목록을 불러오지 못했습니다.'))
        }
      } finally {
        if (!cancelled) setIsLoadingPosts(false)
      }
    }
    loadPosts()
    return () => { cancelled = true }
  }, [boardId, board, isLoadingBoard, page, keyword, reloadKey])

  function handleSearch(event) {
    event.preventDefault()
    setPage(0)
    setKeyword(queryInput.trim())
  }

  const posts = Array.isArray(postsPage?.content) ? postsPage.content : []
  const totalPages = Number(postsPage?.totalPages ?? 0)

  return (
    <main className="board-posts-page">
      <nav className="board-posts-breadcrumb" aria-label="경로">
        <Link to="/boards">게시판 목록</Link><span aria-hidden="true">/</span><span>{board?.name ?? '게시판'}</span>
      </nav>
      <section className="board-posts-heading">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> BOARD</span>
          <h1>{isLoadingBoard ? '게시판 불러오는 중...' : board?.name ?? '게시판'}</h1>
          <p>{board?.description || '게시판의 게시글을 확인하고 검색할 수 있습니다.'}</p>
        </div>
        <Link className="button button-secondary" to="/boards">다른 게시판 선택</Link>
      </section>

      <section className="board-posts-panel" aria-labelledby="board-posts-list-title">
        <div className="board-posts-panel-heading">
          <div>
            <h2 id="board-posts-list-title">게시글</h2>
            <p>제목을 선택하면 상세 내용과 댓글을 확인할 수 있습니다.</p>
          </div>
          <Link className="button button-primary" to={`/boards/${boardId}/posts/new`}>글쓰기</Link>
        </div>

        <form className="board-posts-search" onSubmit={handleSearch}>
          <label className="visually-hidden" htmlFor="board-posts-keyword">게시글 검색어</label>
          <input id="board-posts-keyword" type="search" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="제목 또는 내용 검색" />
          <button className="button button-secondary" type="submit" disabled={isLoadingPosts}>검색</button>
        </form>

        {boardError || postsError ? (
          <ErrorMessage className="board-posts-state" actionLabel="다시 불러오기" onAction={() => { loadBoard(); setReloadKey((current) => current + 1) }}>
            {boardError || postsError}
          </ErrorMessage>
        ) : isLoadingBoard || isLoadingPosts ? (
          <LoadingState className="board-posts-state">게시글을 불러오는 중입니다...</LoadingState>
        ) : posts.length === 0 ? (
          <EmptyState className="board-posts-state" title="게시글이 없습니다.">
            검색어를 바꾸거나 이 게시판의 첫 게시글을 작성해 보세요.
          </EmptyState>
        ) : (
          <>
            <div className="board-posts-list">
              {posts.map((post) => (
                <article className="board-posts-row" key={post.id}>
                  <div className="board-posts-row-main">
                    {post.categoryName && <span className="board-posts-category">{post.categoryName}</span>}
                    <h3><Link to={`/posts/${post.id}`}>{post.title || '(제목 없음)'}</Link></h3>
                    <p>{post.authorNickname || post.authorName || '알 수 없음'} <span aria-hidden="true">·</span> {formatDate(post.createdAt)}</p>
                  </div>
                  <div className="board-posts-metrics" aria-label="게시글 통계">
                    <span>조회 {post.viewCount ?? 0}</span><span>좋아요 {post.likeCount ?? 0}</span>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 && (
              <nav className="board-posts-pagination" aria-label="게시글 페이지">
                <button className="button button-secondary button-small" type="button" disabled={page <= 0 || isLoadingPosts} onClick={() => setPage((current) => Math.max(0, current - 1))}>이전</button>
                <span>{page + 1} / {totalPages}</span>
                <button className="button button-secondary button-small" type="button" disabled={page + 1 >= totalPages || isLoadingPosts} onClick={() => setPage((current) => current + 1)}>다음</button>
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  )
}
