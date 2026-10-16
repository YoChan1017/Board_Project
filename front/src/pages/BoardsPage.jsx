import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState } from '../components/FeedbackState'

const CATEGORY_FILTER_PAGE_SIZE = 100
const TITLE_COLLATOR = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' })

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
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [postsPage, setPostsPage] = useState(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState('latest')
  const [contentReloadKey, setContentReloadKey] = useState(0)
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [boardsError, setBoardsError] = useState('')
  const [postsError, setPostsError] = useState('')

  // When filtering by category, fetch up to the API's maximum page size and paginate
  // the filtered subset locally. With no category filter, keep backend pagination.
  const requestPage = selectedCategoryId === 'all' ? page : 0
  const requestSize = selectedCategoryId === 'all' ? pageSize : CATEGORY_FILTER_PAGE_SIZE

  const loadBoards = useCallback(async () => {
    setIsLoadingBoards(true)
    setBoardsError('')
    try {
      const data = await boardApi.getBoards()
      const safeBoards = Array.isArray(data) ? data : []
      setBoards(safeBoards)
      setSelectedBoardId((current) => {
        if (current && safeBoards.some((board) => String(board.id) === current)) return current
        return safeBoards.length ? String(safeBoards[0].id) : ''
      })
    } catch (requestError) {
      setBoardsError(getErrorMessage(requestError, '게시판 목록을 불러오지 못했습니다.'))
    } finally {
      setIsLoadingBoards(false)
    }
  }, [])

  useEffect(() => { loadBoards() }, [loadBoards])

  useEffect(() => {
    if (!selectedBoardId) {
      setCategories([])
      setPostsPage(null)
      setIsLoadingPosts(false)
      return undefined
    }

    let cancelled = false
    async function loadBoardContent() {
      setIsLoadingPosts(true)
      setPostsError('')
      try {
        const [categoryData, postData] = await Promise.all([
          boardApi.getCategories(selectedBoardId),
          boardApi.getPosts(selectedBoardId, { page: requestPage, size: requestSize, keyword }),
        ])
        if (!cancelled) {
          setCategories(Array.isArray(categoryData) ? categoryData : [])
          setPostsPage(postData)
        }
      } catch (requestError) {
        if (!cancelled) setPostsError(getErrorMessage(requestError, '게시글을 불러오지 못했습니다.'))
      } finally {
        if (!cancelled) setIsLoadingPosts(false)
      }
    }

    loadBoardContent()
    return () => { cancelled = true }
  }, [selectedBoardId, requestPage, requestSize, keyword, contentReloadKey])

  const handleSearch = (event) => {
    event.preventDefault()
    setPage(0)
    setPostsError('')
    setKeyword(keywordInput.trim())
  }

  const clearSearch = () => {
    setKeywordInput('')
    setKeyword('')
    setPage(0)
    setPostsError('')
  }

  const handleBoardSelect = (boardId) => {
    setSelectedBoardId(String(boardId))
    setSelectedCategoryId('all')
    setPage(0)
    setKeyword('')
    setKeywordInput('')
    setPostsError('')
  }

  const rawPostItems = postsPage?.content ?? []
  const categoryFilteredPostItems = useMemo(() => {
    if (selectedCategoryId === 'all') return rawPostItems
    return rawPostItems.filter((post) => String(post.categoryId ?? '') === selectedCategoryId)
  }, [rawPostItems, selectedCategoryId])

  const sortedPostItems = useMemo(() => {
    const items = [...categoryFilteredPostItems]
    if (sortBy === 'title') return items.sort((a, b) => TITLE_COLLATOR.compare(a.title ?? '', b.title ?? ''))
    if (sortBy === 'views') return items.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    if (sortBy === 'likes') return items.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
    // The API's default order is newest first; keep it unchanged for this option.
    return items
  }, [categoryFilteredPostItems, sortBy])

  const isCategoryFilterActive = selectedCategoryId !== 'all'
  const categoryFilterHasMoreResults = isCategoryFilterActive
    && Number(postsPage?.totalElements ?? 0) > rawPostItems.length
  const totalPages = isCategoryFilterActive
    ? Math.ceil(sortedPostItems.length / pageSize)
    : (postsPage?.totalPages ?? 0)
  const totalElements = isCategoryFilterActive
    ? sortedPostItems.length
    : (postsPage?.totalElements ?? 0)
  const visiblePostItems = isCategoryFilterActive
    ? sortedPostItems.slice(page * pageSize, (page + 1) * pageSize)
    : sortedPostItems
  const selectedBoard = boards.find((board) => String(board.id) === selectedBoardId)
  const selectedCategory = categories.find((category) => String(category.id) === selectedCategoryId)

  return (
    <main className="boards-page">
      <section className="boards-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> COMMUNITY BOARDS</span>
        <h1>게시판</h1>
        <p>관심 있는 게시판을 선택하고 최신 글을 확인하세요.</p>
      </section>

      {boardsError && boards.length > 0 && (
        <ErrorMessage className="boards-alert" actionLabel="게시판 다시 불러오기" onAction={loadBoards}>
          {boardsError}
        </ErrorMessage>
      )}

      {isLoadingBoards ? (
        <LoadingState className="boards-state milestone-19-page-state">게시판 목록을 불러오는 중입니다...</LoadingState>
      ) : boards.length === 0 ? (
        <EmptyState
          className="boards-empty milestone-19-empty-state"
          icon={boardsError ? '!' : 'B'}
          title={boardsError ? '게시판 목록을 표시할 수 없습니다.' : '등록된 게시판이 없습니다.'}
          description={boardsError ? '연결 상태를 확인한 뒤 다시 시도해 주세요.' : '게시판이 등록되면 이곳에서 게시글을 확인할 수 있습니다.'}
        >
          {boardsError && <button type="button" className="button button-primary button-small" onClick={loadBoards} disabled={isLoadingBoards}>다시 시도</button>}
        </EmptyState>
      ) : (
        <>
          <section className="board-selector" aria-label="게시판 선택">
            {boards.map((board) => (
              <button
                type="button"
                key={board.id}
                className={`board-choice${String(board.id) === selectedBoardId ? ' selected' : ''}`}
                onClick={() => handleBoardSelect(board.id)}
                aria-pressed={String(board.id) === selectedBoardId}
              >
                <span className="board-choice-mark" aria-hidden="true">B</span>
                <span className="board-choice-copy">
                  <strong>{board.name}</strong>
                  <small>{board.description || '게시판 글을 확인해 보세요.'}</small>
                </span>
                <span className="board-choice-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </section>

          <section className="post-list-panel" aria-busy={isLoadingPosts}>
            <div className="post-list-heading">
              <div>
                <span className="panel-kicker">SELECTED BOARD</span>
                <h2>{selectedBoard?.name || '게시글 목록'}</h2>
                <p>{selectedBoard?.description || '게시판의 최신 게시글입니다.'}</p>
              </div>
              <div className="post-list-heading-actions">
                <span className="post-total">{totalElements.toLocaleString('ko-KR')}개 게시글</span>
                <Link to={selectedBoardId ? `/boards/${selectedBoardId}/posts/new` : '/boards'} className="button button-primary button-small" aria-disabled={!selectedBoardId}>
                  글쓰기 <span aria-hidden="true">＋</span>
                </Link>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="category-tags" aria-label="등록된 카테고리">
                {categories.map((category) => <span key={category.id} className="category-tag">{category.name}</span>)}
              </div>
            )}

            <form className="post-search" onSubmit={handleSearch} role="search">
              <label className="visually-hidden" htmlFor="post-keyword">게시글 검색</label>
              <input
                id="post-keyword"
                type="search"
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="제목 또는 내용 검색"
                aria-describedby="post-search-help"
              />
              <span id="post-search-help" className="visually-hidden">선택된 게시판의 제목 또는 내용으로 검색합니다.</span>
              <button type="submit" className="button button-primary" disabled={isLoadingPosts}>검색</button>
              {(keyword || keywordInput) && (
                <button type="button" className="button button-secondary" onClick={clearSearch} disabled={isLoadingPosts}>초기화</button>
              )}
            </form>

            <div className="board-explorer-controls" aria-label="게시글 표시 옵션">
              <div className="board-explorer-control">
                <label htmlFor="post-category-filter">카테고리</label>
                <select
                  id="post-category-filter"
                  value={selectedCategoryId}
                  onChange={(event) => { setSelectedCategoryId(event.target.value); setPage(0) }}
                  disabled={isLoadingPosts || categories.length === 0}
                >
                  <option value="all">전체 카테고리</option>
                  {categories.map((category) => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
                </select>
              </div>
              <div className="board-explorer-control">
                <label htmlFor="post-page-size">페이지당 게시글</label>
                <select
                  id="post-page-size"
                  value={pageSize}
                  onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }}
                  disabled={isLoadingPosts}
                >
                  <option value={10}>10개</option>
                  <option value={20}>20개</option>
                  <option value={50}>50개</option>
                </select>
              </div>
              <div className="board-explorer-control">
                <label htmlFor="post-sort-order">정렬</label>
                <select id="post-sort-order" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(0) }} disabled={isLoadingPosts}>
                  <option value="latest">최신순</option>
                  <option value="title">제목 가나다순</option>
                  <option value="views">조회 많은 순</option>
                  <option value="likes">좋아요 많은 순</option>
                </select>
              </div>
              <p>{isCategoryFilterActive ? '카테고리 선택 시 조회된 최대 100개 결과에서 필터링합니다.' : '정렬은 현재 불러온 페이지 안에서만 적용됩니다.'}</p>
            </div>

            {keyword && (
              <p className="board-search-summary" aria-live="polite">
                <span>검색어</span> “{keyword}” · {totalElements.toLocaleString('ko-KR')}개 결과
                {selectedCategory && <> · 카테고리: {selectedCategory.name}</>}
              </p>
            )}
            {isCategoryFilterActive && !keyword && (
              <p className="board-search-summary" aria-live="polite">
                <span>카테고리</span> {selectedCategory?.name || '선택한 카테고리'} · {totalElements.toLocaleString('ko-KR')}개 결과
              </p>
            )}
            {categoryFilterHasMoreResults && !postsError && (
              <p className="category-filter-notice" role="status">
                게시판 검색 API의 페이지 크기 제한 때문에 최근 조회 결과 최대 100개만 필터링했습니다. 정확한 전체 카테고리 검색에는 백엔드 카테고리 필터 API가 필요합니다.
              </p>
            )}

            {postsError && (
              <ErrorMessage
                className="boards-alert board-posts-alert"
                actionLabel="게시글 다시 불러오기"
                onAction={() => setContentReloadKey((current) => current + 1)}
              >
                {postsError}
              </ErrorMessage>
            )}

            {isLoadingPosts ? (
              <LoadingState className="boards-state milestone-19-page-state">게시글을 불러오는 중입니다...</LoadingState>
            ) : postsError ? null : visiblePostItems.length === 0 ? (
              <EmptyState
                className="posts-empty milestone-19-empty-state"
                icon="✎"
                title={isCategoryFilterActive ? '선택한 조건에 맞는 게시글이 없습니다.' : keyword ? '검색 결과가 없습니다.' : '아직 게시글이 없습니다.'}
                description={isCategoryFilterActive ? '다른 카테고리를 선택하거나 필터를 초기화해 보세요.' : keyword ? '검색어를 변경하거나 초기화해 보세요.' : '첫 게시글을 작성해 보세요.'}
              >
                {isCategoryFilterActive && <button type="button" className="button button-secondary button-small" onClick={() => { setSelectedCategoryId('all'); setPage(0) }}>카테고리 필터 초기화</button>}
                {!keyword && !isCategoryFilterActive && selectedBoardId && <Link to={`/boards/${selectedBoardId}/posts/new`} className="text-link">첫 글 작성하기 →</Link>}
              </EmptyState>
            ) : (
              <>
                <div className="post-table-wrap">
                  <table className="post-table">
                    <thead><tr><th scope="col">제목</th><th scope="col">작성자</th><th scope="col">조회</th><th scope="col">좋아요</th><th scope="col">작성일</th></tr></thead>
                    <tbody>
                      {visiblePostItems.map((post) => (
                        <tr key={post.id}>
                          <td><div className="post-title-cell">{post.categoryName && <span className="category-inline">{post.categoryName}</span>}<Link to={`/posts/${post.id}`} className="post-title-link">{post.title}</Link></div></td>
                          <td>{post.authorNickname || '-'}</td>
                          <td>{(post.viewCount ?? 0).toLocaleString('ko-KR')}</td>
                          <td>{(post.likeCount ?? 0).toLocaleString('ko-KR')}</td>
                          <td>{formatDate(post.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <nav className="pagination" aria-label="게시글 페이지">
                  <button type="button" className="button button-secondary button-small" disabled={page <= 0 || isLoadingPosts} onClick={() => setPage((value) => Math.max(0, value - 1))}>이전</button>
                  <span aria-live="polite">{page + 1} / {Math.max(totalPages, 1)} 페이지</span>
                  <button type="button" className="button button-secondary button-small" disabled={page + 1 >= totalPages || isLoadingPosts} onClick={() => setPage((value) => value + 1)}>다음</button>
                </nav>
              </>
            )}
          </section>
        </>
      )}
      <div className="boards-footer-link"><Link to="/dashboard" className="text-link">대시보드로 돌아가기 <span aria-hidden="true">→</span></Link></div>
    </main>
  )
}
