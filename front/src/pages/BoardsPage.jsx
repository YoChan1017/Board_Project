import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { ErrorMessage, LoadingState } from '../components/FeedbackState'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

export default function BoardsPage() {
  const [boards, setBoards] = useState([])
  const [selectedBoardId, setSelectedBoardId] = useState('')
  const [categories, setCategories] = useState([])
  const [postsPage, setPostsPage] = useState(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [error, setError] = useState('')

  const loadBoards = useCallback(async () => {
    setIsLoadingBoards(true)
    setError('')
    try {
      const data = await boardApi.getBoards()
      const safeBoards = Array.isArray(data) ? data : []
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

  useEffect(() => { loadBoards() }, [loadBoards])

  useEffect(() => {
    if (!selectedBoardId) {
      setCategories([])
      setPostsPage(null)
      return undefined
    }
    let cancelled = false
    async function loadBoardContent() {
      setIsLoadingPosts(true)
      setError('')
      try {
        const [categoryData, postData] = await Promise.all([
          boardApi.getCategories(selectedBoardId),
          boardApi.getPosts(selectedBoardId, { page, size: 10, keyword }),
        ])
        if (!cancelled) {
          setCategories(Array.isArray(categoryData) ? categoryData : [])
          setPostsPage(postData)
        }
      } catch (requestError) {
        if (!cancelled) setError(getErrorMessage(requestError, '게시글을 불러오지 못했습니다.'))
      } finally {
        if (!cancelled) setIsLoadingPosts(false)
      }
    }
    loadBoardContent()
    return () => { cancelled = true }
  }, [selectedBoardId, page, keyword])

  const handleSearch = (event) => {
    event.preventDefault()
    setPage(0)
    setKeyword(keywordInput.trim())
  }
  const postItems = postsPage?.content ?? []
  const totalPages = postsPage?.totalPages ?? 0
  const totalElements = postsPage?.totalElements ?? 0
  const selectedBoard = boards.find((board) => String(board.id) === selectedBoardId)

  return (
    <main className="boards-page">
      <section className="boards-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> COMMUNITY BOARDS</span>
        <h1>게시판</h1>
        <p>관심 있는 게시판을 선택하고 최신 글을 확인하세요.</p>
      </section>

      {error && (
        <ErrorMessage
          className="boards-alert"
          actionLabel="게시판 다시 불러오기"
          onAction={loadBoards}
        >
          {error}
        </ErrorMessage>
      )}

      {isLoadingBoards ? <LoadingState className="boards-state">게시판 목록을 불러오는 중입니다...</LoadingState> : boards.length === 0 ? (
        <section className="boards-empty"><h2>등록된 게시판이 없습니다.</h2><p>백엔드 데이터베이스에 게시판을 먼저 등록해 주세요.</p></section>
      ) : (
        <>
          <section className="board-selector" aria-label="게시판 선택">
            {boards.map((board) => (
              <button type="button" key={board.id} className={`board-choice${String(board.id) === selectedBoardId ? ' selected' : ''}`} onClick={() => { setSelectedBoardId(String(board.id)); setPage(0); setKeyword(''); setKeywordInput('') }} aria-pressed={String(board.id) === selectedBoardId}>
                <span className="board-choice-mark">B</span><span className="board-choice-copy"><strong>{board.name}</strong><small>{board.description || '게시판 글을 확인해 보세요.'}</small></span><span className="board-choice-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </section>

          <section className="post-list-panel">
            <div className="post-list-heading">
              <div><span className="panel-kicker">SELECTED BOARD</span><h2>{selectedBoard?.name || '게시글 목록'}</h2><p>{selectedBoard?.description || '게시판의 최신 게시글입니다.'}</p></div>
              <div className="post-list-heading-actions"><span className="post-total">{totalElements}개 게시글</span><Link to={selectedBoardId ? `/boards/${selectedBoardId}/posts/new` : '/boards'} className="button button-primary button-small" aria-disabled={!selectedBoardId}>글쓰기 <span aria-hidden="true">＋</span></Link></div>
            </div>

            {categories.length > 0 && <div className="category-tags" aria-label="등록된 카테고리">{categories.map((category) => <span key={category.id} className="category-tag">{category.name}</span>)}</div>}

            <form className="post-search" onSubmit={handleSearch}>
              <label className="visually-hidden" htmlFor="post-keyword">게시글 검색</label>
              <input id="post-keyword" type="search" value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="제목 또는 내용 검색" />
              <button type="submit" className="button button-primary">검색</button>
              {keyword && <button type="button" className="button button-secondary" onClick={() => { setKeywordInput(''); setKeyword(''); setPage(0) }}>초기화</button>}
            </form>

            {isLoadingPosts ? <LoadingState className="boards-state">게시글을 불러오는 중입니다...</LoadingState> : postItems.length === 0 ? (
              <div className="posts-empty"><span className="posts-empty-icon">✎</span><h3>{keyword ? '검색 결과가 없습니다.' : '아직 게시글이 없습니다.'}</h3><p>{keyword ? '다른 검색어를 입력해 보세요.' : '첫 게시글을 작성해 보세요.'}</p>{!keyword && selectedBoardId && <Link to={`/boards/${selectedBoardId}/posts/new`} className="text-link">첫 글 작성하기 →</Link>}</div>
            ) : (
              <>
                <div className="post-table-wrap"><table className="post-table"><thead><tr><th scope="col">제목</th><th scope="col">작성자</th><th scope="col">조회</th><th scope="col">좋아요</th><th scope="col">작성일</th></tr></thead><tbody>
                  {postItems.map((post) => <tr key={post.id}><td><div className="post-title-cell">{post.categoryName && <span className="category-inline">{post.categoryName}</span>}<Link to={`/posts/${post.id}`} className="post-title-link">{post.title}</Link></div></td><td>{post.authorNickname || '-'}</td><td>{post.viewCount ?? 0}</td><td>{post.likeCount ?? 0}</td><td>{formatDate(post.createdAt)}</td></tr>)}
                </tbody></table></div>
                <nav className="pagination" aria-label="게시글 페이지"><button type="button" className="button button-secondary button-small" disabled={page <= 0 || isLoadingPosts} onClick={() => setPage((value) => Math.max(0, value - 1))}>이전</button><span>{page + 1} / {Math.max(totalPages, 1)}</span><button type="button" className="button button-secondary button-small" disabled={page + 1 >= totalPages || isLoadingPosts} onClick={() => setPage((value) => value + 1)}>다음</button></nav>
              </>
            )}
          </section>
        </>
      )}
      <div className="boards-footer-link"><Link to="/dashboard" className="text-link">대시보드로 돌아가기 <span aria-hidden="true">→</span></Link></div>
    </main>
  )
}
