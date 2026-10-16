import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState } from '../components/FeedbackState'

const SEARCH_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20
const TITLE_COLLATOR = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' })

function formatDate(value) {
  if (!value) return '시간 정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '시간 정보 없음'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function getTimestamp(value) {
  const timestamp = new Date(value ?? 0).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export default function GlobalSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = (searchParams.get('q') ?? '').trim()
  const [boards, setBoards] = useState([])
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [boardsError, setBoardsError] = useState('')
  const [keywordInput, setKeywordInput] = useState(queryFromUrl)
  const [selectedBoardId, setSelectedBoardId] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(0)
  const [searchVersion, setSearchVersion] = useState(0)
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [failedBoardCount, setFailedBoardCount] = useState(0)
  const [truncatedBoardCount, setTruncatedBoardCount] = useState(0)
  const [inputError, setInputError] = useState('')

  const loadBoards = useCallback(async () => {
    setIsLoadingBoards(true)
    setBoardsError('')
    try {
      const data = await boardApi.getBoards()
      setBoards(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setBoardsError(getErrorMessage(requestError, '게시판 목록을 불러오지 못했습니다.'))
      setBoards([])
    } finally {
      setIsLoadingBoards(false)
    }
  }, [])

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  useEffect(() => {
    setKeywordInput(queryFromUrl)
    setInputError('')
    setPage(0)
  }, [queryFromUrl])

  useEffect(() => {
    if (!queryFromUrl) {
      setResults([])
      setFailedBoardCount(0)
      setTruncatedBoardCount(0)
      setSearchError('')
      setIsSearching(false)
      return undefined
    }
    if (isLoadingBoards || boardsError) return undefined

    const targetBoards = selectedBoardId === 'all'
      ? boards
      : boards.filter((board) => String(board.id) === String(selectedBoardId))

    let cancelled = false
    async function runGlobalSearch() {
      setIsSearching(true)
      setSearchError('')
      setFailedBoardCount(0)
      setTruncatedBoardCount(0)
      setPage(0)

      if (targetBoards.length === 0) {
        setResults([])
        setIsSearching(false)
        return
      }

      try {
        const settled = await Promise.allSettled(targetBoards.map(async (board) => {
          const resultPage = await boardApi.getPosts(board.id, {
            page: 0,
            size: SEARCH_PAGE_SIZE,
            keyword: queryFromUrl,
          })
          return { board, resultPage }
        }))

        if (cancelled) return

        const fulfilled = settled
          .filter((item) => item.status === 'fulfilled')
          .map((item) => item.value)
        const failedCount = settled.length - fulfilled.length
        const limitedCount = fulfilled.filter(({ resultPage }) => Number(resultPage?.totalElements ?? 0) > SEARCH_PAGE_SIZE).length
        const items = fulfilled.flatMap(({ board, resultPage }) => {
          const content = Array.isArray(resultPage?.content) ? resultPage.content : []
          return content.map((post) => ({
            ...post,
            searchBoardId: String(board.id),
            searchBoardName: board.name || `게시판 #${board.id}`,
          }))
        })

        setResults(items)
        setFailedBoardCount(failedCount)
        setTruncatedBoardCount(limitedCount)
        if (fulfilled.length === 0) {
          setSearchError('검색 결과를 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.')
        }
      } catch (requestError) {
        if (!cancelled) setSearchError(getErrorMessage(requestError, '통합 검색에 실패했습니다.'))
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }

    runGlobalSearch()
    return () => { cancelled = true }
  }, [queryFromUrl, selectedBoardId, boards, isLoadingBoards, boardsError, searchVersion])

  const sortedResults = useMemo(() => {
    const items = [...results]
    if (sortBy === 'title') return items.sort((a, b) => TITLE_COLLATOR.compare(a.title ?? '', b.title ?? ''))
    if (sortBy === 'views') return items.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    if (sortBy === 'likes') return items.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
    return items.sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt))
  }, [results, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize))
  const visibleResults = sortedResults.slice(page * pageSize, (page + 1) * pageSize)

  function handleSubmit(event) {
    event.preventDefault()
    const keyword = keywordInput.trim()
    if (!keyword) {
      setInputError('검색어를 입력해 주세요.')
      return
    }
    setInputError('')
    if (keyword === queryFromUrl) {
      setSearchVersion((current) => current + 1)
    } else {
      setSearchParams({ q: keyword })
    }
  }

  function clearSearch() {
    setKeywordInput('')
    setInputError('')
    setPage(0)
    setSearchParams({})
  }

  return (
    <main className="global-search-page">
      <section className="global-search-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> SEARCH ALL BOARDS</span>
        <h1>통합 검색</h1>
        <p>여러 게시판의 게시글을 한 번에 검색합니다.</p>
      </section>

      <section className="global-search-panel" aria-labelledby="global-search-title">
        <h2 id="global-search-title">무엇을 찾고 있나요?</h2>
        <form className="global-search-form" onSubmit={handleSubmit} role="search">
          <label className="visually-hidden" htmlFor="global-search-keyword">검색어</label>
          <input
            id="global-search-keyword"
            type="search"
            value={keywordInput}
            onChange={(event) => { setKeywordInput(event.target.value); setInputError('') }}
            placeholder="게시글 제목 또는 내용 입력"
            maxLength={200}
            aria-invalid={Boolean(inputError)}
            aria-describedby={inputError ? 'global-search-input-error' : 'global-search-help'}
          />
          <button type="submit" className="button button-primary" disabled={isSearching || isLoadingBoards}>검색</button>
          {(keywordInput || queryFromUrl) && <button type="button" className="button button-secondary" onClick={clearSearch}>초기화</button>}
        </form>
        {inputError && <p id="global-search-input-error" className="global-search-input-error" role="alert">{inputError}</p>}
        {!inputError && <p id="global-search-help" className="global-search-help">선택한 게시판에서 제목과 내용이 일치하는 게시글을 찾습니다.</p>}

        <div className="global-search-filters">
          <div className="global-search-filter">
            <label htmlFor="global-search-board">검색 범위</label>
            <select id="global-search-board" value={selectedBoardId} onChange={(event) => { setSelectedBoardId(event.target.value); setPage(0) }} disabled={isLoadingBoards || boards.length === 0}>
              <option value="all">전체 게시판</option>
              {boards.map((board) => <option key={board.id} value={String(board.id)}>{board.name}</option>)}
            </select>
          </div>
          <div className="global-search-filter">
            <label htmlFor="global-search-sort">정렬</label>
            <select id="global-search-sort" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(0) }}>
              <option value="latest">최신순</option>
              <option value="views">조회 많은 순</option>
              <option value="likes">좋아요 많은 순</option>
              <option value="title">제목 가나다순</option>
            </select>
          </div>
          <div className="global-search-filter">
            <label htmlFor="global-search-page-size">페이지당 결과</label>
            <select id="global-search-page-size" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }}>
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
            </select>
          </div>
        </div>
      </section>

      {boardsError && <ErrorMessage className="global-search-error" actionLabel="게시판 다시 불러오기" onAction={loadBoards}>{boardsError}</ErrorMessage>}
      {isLoadingBoards && <LoadingState className="global-search-state">게시판 목록을 불러오는 중입니다...</LoadingState>}
      {queryFromUrl && isSearching && <LoadingState className="global-search-state">게시글을 검색하고 있습니다...</LoadingState>}
      {searchError && !isSearching && <ErrorMessage className="global-search-error" actionLabel="다시 검색" onAction={() => setSearchVersion((current) => current + 1)}>{searchError}</ErrorMessage>}

      {queryFromUrl && !isSearching && !searchError && !boardsError && (
        <section className="global-search-results" aria-labelledby="global-search-results-title" aria-busy={isSearching}>
          <div className="global-search-results-heading">
            <div>
              <span className="panel-kicker">SEARCH RESULTS</span>
              <h2 id="global-search-results-title">“{queryFromUrl}” 검색 결과</h2>
              <p>{selectedBoardId === 'all' ? '전체 게시판' : boards.find((board) => String(board.id) === selectedBoardId)?.name || '선택한 게시판'}에서 {results.length.toLocaleString('ko-KR')}개를 찾았습니다.</p>
            </div>
            <span className="global-search-result-count">{results.length.toLocaleString('ko-KR')}개</span>
          </div>

          {failedBoardCount > 0 && <p className="global-search-warning" role="status">{failedBoardCount}개 게시판에서 검색하지 못했습니다. 표시된 결과는 일부 게시판을 제외할 수 있습니다.</p>}
          {truncatedBoardCount > 0 && <p className="global-search-warning" role="status">{truncatedBoardCount}개 게시판에서 검색 결과가 100개를 초과했습니다. 해당 게시판의 추가 결과는 표시되지 않을 수 있습니다.</p>}

          {results.length === 0 ? (
            <EmptyState className="global-search-empty" icon="⌕" title="검색 결과가 없습니다." description="검색어를 바꾸거나 전체 게시판을 선택해 다시 검색해 보세요.">
              <button type="button" className="button button-secondary button-small" onClick={() => { setKeywordInput(''); setSearchParams({}) }}>검색어 지우기</button>
            </EmptyState>
          ) : (
            <>
              <ul className="global-search-result-list">
                {visibleResults.map((post) => (
                  <li className="global-search-result-item" key={`${post.searchBoardId}-${post.id}`}>
                    <div className="global-search-result-main">
                      <div className="global-search-result-labels">
                        <span className="global-search-board-label">{post.searchBoardName}</span>
                        {post.categoryName && <span className="category-tag">{post.categoryName}</span>}
                      </div>
                      <Link to={`/posts/${post.id}`} className="global-search-result-title">{post.title || '제목 없는 게시글'}</Link>
                      <div className="global-search-result-meta">
                        <span>작성자 {post.authorNickname || '알 수 없는 사용자'}</span>
                        <time dateTime={post.createdAt || undefined}>{formatDate(post.createdAt)}</time>
                      </div>
                    </div>
                    <div className="global-search-result-stats">
                      <span>조회 {Number(post.viewCount ?? 0).toLocaleString('ko-KR')}</span>
                      <span>♥ {Number(post.likeCount ?? 0).toLocaleString('ko-KR')}</span>
                      <Link to={`/posts/${post.id}`} className="button button-secondary button-small">열기</Link>
                    </div>
                  </li>
                ))}
              </ul>
              <nav className="global-search-pagination" aria-label="통합 검색 페이지">
                <button type="button" className="button button-secondary button-small" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page <= 0}>이전</button>
                <span aria-live="polite">{page + 1} / {totalPages} 페이지</span>
                <button type="button" className="button button-secondary button-small" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page + 1 >= totalPages}>다음</button>
              </nav>
            </>
          )}
        </section>
      )}

      {!queryFromUrl && !boardsError && !isLoadingBoards && (
        <EmptyState className="global-search-empty global-search-intro" icon="⌕" title="게시글을 통합 검색해 보세요." description="검색어를 입력하면 선택한 범위에서 제목과 내용이 일치하는 게시글을 찾아줍니다.">
          <Link to="/boards" className="button button-primary button-small">게시판 둘러보기</Link>
        </EmptyState>
      )}
    </main>
  )
}
