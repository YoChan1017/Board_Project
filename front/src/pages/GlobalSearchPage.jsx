import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState } from '../components/FeedbackState'

const SEARCH_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20
const ALLOWED_PAGE_SIZES = [10, 20, 50]
const ALLOWED_SORTS = ['latest', 'views', 'likes', 'title']
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

function getCategoryKey(post) {
  if (post.categoryId !== null && post.categoryId !== undefined) return String(post.categoryId)
  return post.categoryName ? `name:${post.categoryName}` : ''
}

function normalizeDateParam(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return ''
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return ''
  return value
}

function normalizeForSearch(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko-KR').trim()
}

export default function GlobalSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = (searchParams.get('q') ?? '').trim()
  const urlAuthor = (searchParams.get('author') ?? '').trim()
  const fromDate = normalizeDateParam(searchParams.get('from'))
  const toDate = normalizeDateParam(searchParams.get('to'))

  const rawBoardId = searchParams.get('board') ?? 'all'
  const selectedBoardId = rawBoardId || 'all'
  const rawCategoryKey = searchParams.get('category') ?? 'all'
  const selectedCategoryKey = rawCategoryKey || 'all'
  const requestedSort = searchParams.get('sort') ?? 'latest'
  const sortBy = ALLOWED_SORTS.includes(requestedSort) ? requestedSort : 'latest'
  const requestedPageSize = Number(searchParams.get('size'))
  const pageSize = ALLOWED_PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE
  const parsedPage = Number.parseInt(searchParams.get('page') ?? '0', 10)
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 0

  const [boards, setBoards] = useState([])
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [boardsError, setBoardsError] = useState('')
  const [keywordInput, setKeywordInput] = useState(queryFromUrl)
  const [authorInput, setAuthorInput] = useState(urlAuthor)
  const [fromDateInput, setFromDateInput] = useState(fromDate)
  const [toDateInput, setToDateInput] = useState(toDate)
  const [sortInputError, setSortInputError] = useState('')
  const [searchVersion, setSearchVersion] = useState(0)
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [failedBoardCount, setFailedBoardCount] = useState(0)
  const [truncatedBoardCount, setTruncatedBoardCount] = useState(0)
  const [inputError, setInputError] = useState('')
  const [filterInputError, setFilterInputError] = useState('')

  const updateSearchParams = useCallback((updates, { resetPage = true, replace = true } = {}) => {
    const next = new URLSearchParams(searchParams)
    const defaults = { board: 'all', category: 'all', sort: 'latest', size: String(DEFAULT_PAGE_SIZE), page: '0' }

    Object.entries(updates).forEach(([key, value]) => {
      const text = value === null || value === undefined ? '' : String(value).trim()
      if (!text || (Object.hasOwn(defaults, key) && text === defaults[key])) {
        next.delete(key)
      } else {
        next.set(key, text)
      }
    })

    if (resetPage && !Object.hasOwn(updates, 'page')) next.delete('page')
    setSearchParams(next, { replace })
  }, [searchParams, setSearchParams])

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
  }, [queryFromUrl])

  useEffect(() => {
    setAuthorInput(urlAuthor)
    setFromDateInput(fromDate)
    setToDateInput(toDate)
    setFilterInputError('')
  }, [urlAuthor, fromDate, toDate])

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

  // If a saved link references a board that has since been deleted, recover to all boards.
  useEffect(() => {
    if (isLoadingBoards || boardsError || selectedBoardId === 'all' || boards.length === 0) return
    if (!boards.some((board) => String(board.id) === selectedBoardId)) {
      updateSearchParams({ board: 'all', category: 'all' })
    }
  }, [selectedBoardId, boards, isLoadingBoards, boardsError, updateSearchParams])

  const categoryOptions = useMemo(() => {
    const byKey = new Map()
    results.forEach((post) => {
      if (!post.categoryName) return
      const key = getCategoryKey(post)
      if (!key || byKey.has(key)) return
      byKey.set(key, { key, name: post.categoryName })
    })
    return [...byKey.values()].sort((a, b) => TITLE_COLLATOR.compare(a.name, b.name))
  }, [results])

  const filteredResults = useMemo(() => {
    const normalizedAuthor = normalizeForSearch(urlAuthor)
    return results.filter((post) => {
      if (selectedCategoryKey !== 'all' && getCategoryKey(post) !== selectedCategoryKey) return false

      if (normalizedAuthor && !normalizeForSearch(post.authorNickname).includes(normalizedAuthor)) return false

      const createdDay = String(post.createdAt ?? '').slice(0, 10)
      if (fromDate && (!createdDay || createdDay < fromDate)) return false
      if (toDate && (!createdDay || createdDay > toDate)) return false
      return true
    })
  }, [results, selectedCategoryKey, urlAuthor, fromDate, toDate])

  const sortedResults = useMemo(() => {
    const items = [...filteredResults]
    if (sortBy === 'title') return items.sort((a, b) => TITLE_COLLATOR.compare(a.title ?? '', b.title ?? ''))
    if (sortBy === 'views') return items.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    if (sortBy === 'likes') return items.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
    return items.sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt))
  }, [filteredResults, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const visibleResults = sortedResults.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  const isCategoryFilterActive = selectedCategoryKey !== 'all'
  const isAuthorFilterActive = Boolean(urlAuthor)
  const isDateFilterActive = Boolean(fromDate || toDate)
  const hasActiveFilters = selectedBoardId !== 'all' || isCategoryFilterActive || isAuthorFilterActive || isDateFilterActive

  useEffect(() => {
    if (page <= totalPages - 1) return
    updateSearchParams({ page: totalPages > 1 ? totalPages - 1 : 0 }, { resetPage: false })
  }, [page, totalPages, updateSearchParams])

  function handleSubmit(event) {
    event.preventDefault()
    const keyword = keywordInput.trim()
    if (!keyword) {
      setInputError('검색어를 입력해 주세요.')
      return
    }
    setInputError('')

    if (keyword === queryFromUrl) {
      updateSearchParams({ page: 0 })
      setSearchVersion((current) => current + 1)
      return
    }

    // Preserve scope, author/date filters, sorting and page size, but clear a category
    // that may not exist in the new result set.
    const next = new URLSearchParams(searchParams)
    next.set('q', keyword)
    next.delete('category')
    next.delete('page')
    setSearchParams(next)
  }

  function handleApplyAdvancedFilters(event) {
    event.preventDefault()
    const author = authorInput.trim()
    const from = normalizeDateParam(fromDateInput)
    const to = normalizeDateParam(toDateInput)

    if (fromDateInput && !from) {
      setFilterInputError('시작일이 올바른 날짜인지 확인해 주세요.')
      return
    }
    if (toDateInput && !to) {
      setFilterInputError('종료일이 올바른 날짜인지 확인해 주세요.')
      return
    }
    if (from && to && from > to) {
      setFilterInputError('시작일은 종료일보다 늦을 수 없습니다.')
      return
    }

    setFilterInputError('')
    updateSearchParams({ author, from, to })
  }

  function clearSearch() {
    setKeywordInput('')
    setInputError('')
    setFilterInputError('')
    setSearchParams({})
  }

  function resetFilters() {
    setAuthorInput('')
    setFromDateInput('')
    setToDateInput('')
    setFilterInputError('')
    updateSearchParams({
      board: 'all', category: 'all', author: '', from: '', to: '',
      sort: 'latest', size: DEFAULT_PAGE_SIZE, page: 0,
    })
  }

  function changePage(nextPage) {
    updateSearchParams({ page: Math.max(0, Math.min(totalPages - 1, nextPage)) }, { resetPage: false })
  }

  return (
    <main className="global-search-page">
      <section className="global-search-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> SEARCH ALL BOARDS</span>
        <h1>통합 검색</h1>
        <p>게시판, 카테고리, 작성자와 작성일 조건을 조합해 게시글을 찾습니다.</p>
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
        {!inputError && <p id="global-search-help" className="global-search-help">검색어를 입력한 뒤 추가 조건을 적용하면 더 정확하게 결과를 좁힐 수 있습니다.</p>}

        <div className="global-search-filters">
          <div className="global-search-filter">
            <label htmlFor="global-search-board">검색 범위</label>
            <select
              id="global-search-board"
              value={selectedBoardId}
              onChange={(event) => updateSearchParams({ board: event.target.value, category: 'all' })}
              disabled={isLoadingBoards || boards.length === 0}
            >
              <option value="all">전체 게시판</option>
              {boards.map((board) => <option key={board.id} value={String(board.id)}>{board.name}</option>)}
            </select>
          </div>
          <div className="global-search-filter">
            <label htmlFor="global-search-category">카테고리</label>
            <select
              id="global-search-category"
              value={selectedCategoryKey}
              onChange={(event) => updateSearchParams({ category: event.target.value })}
              disabled={!queryFromUrl || isSearching || categoryOptions.length === 0}
            >
              <option value="all">전체 카테고리</option>
              {selectedCategoryKey !== 'all' && !categoryOptions.some((category) => category.key === selectedCategoryKey) && (
                <option value={selectedCategoryKey}>현재 결과에 없는 카테고리</option>
              )}
              {categoryOptions.map((category) => <option key={category.key} value={category.key}>{category.name}</option>)}
            </select>
          </div>
          <div className="global-search-filter">
            <label htmlFor="global-search-sort">정렬</label>
            <select id="global-search-sort" value={sortBy} onChange={(event) => updateSearchParams({ sort: event.target.value })}>
              <option value="latest">최신순</option>
              <option value="views">조회 많은 순</option>
              <option value="likes">좋아요 많은 순</option>
              <option value="title">제목 가나다순</option>
            </select>
          </div>
          <div className="global-search-filter">
            <label htmlFor="global-search-page-size">페이지당 결과</label>
            <select id="global-search-page-size" value={pageSize} onChange={(event) => updateSearchParams({ size: event.target.value })}>
              {ALLOWED_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}개</option>)}
            </select>
          </div>
        </div>

        <div className="global-search-advanced-panel">
          <div className="global-search-advanced-heading">
            <h3>세부 조건</h3>
            <span>작성자 · 작성일</span>
          </div>
          <form className="global-search-advanced-form" onSubmit={handleApplyAdvancedFilters}>
            <div className="global-search-advanced-field global-search-author-field">
              <label htmlFor="global-search-author">작성자 닉네임</label>
              <input
                id="global-search-author"
                type="search"
                value={authorInput}
                onChange={(event) => { setAuthorInput(event.target.value); setFilterInputError('') }}
                placeholder="닉네임 일부 입력"
                maxLength={80}
                disabled={!queryFromUrl || isSearching}
              />
            </div>
            <div className="global-search-advanced-field">
              <label htmlFor="global-search-from">작성일 시작</label>
              <input
                id="global-search-from"
                type="date"
                value={fromDateInput}
                max={toDateInput || undefined}
                onChange={(event) => { setFromDateInput(event.target.value); setFilterInputError('') }}
                disabled={!queryFromUrl || isSearching}
              />
            </div>
            <div className="global-search-advanced-field">
              <label htmlFor="global-search-to">작성일 종료</label>
              <input
                id="global-search-to"
                type="date"
                value={toDateInput}
                min={fromDateInput || undefined}
                onChange={(event) => { setToDateInput(event.target.value); setFilterInputError('') }}
                disabled={!queryFromUrl || isSearching}
              />
            </div>
            <div className="global-search-advanced-actions">
              <button type="submit" className="button button-primary button-small" disabled={!queryFromUrl || isSearching}>조건 적용</button>
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => {
                  setAuthorInput('')
                  setFromDateInput('')
                  setToDateInput('')
                  setFilterInputError('')
                  updateSearchParams({ author: '', from: '', to: '' })
                }}
                disabled={!queryFromUrl || isSearching || (!authorInput && !fromDateInput && !toDateInput && !urlAuthor && !fromDate && !toDate)}
              >
                조건 지우기
              </button>
            </div>
          </form>
          {filterInputError && <p className="global-search-input-error" role="alert">{filterInputError}</p>}
          <p className="global-search-advanced-help">작성자 닉네임은 일부 일치로 검색하며, 시작일과 종료일은 모두 포함합니다. 검색어로 조회한 결과 안에서 적용됩니다.</p>
        </div>

        {hasActiveFilters && (
          <div className="global-search-filter-summary">
            <span>
              적용 조건: {[selectedBoardId !== 'all' ? '선택한 게시판' : '', isCategoryFilterActive ? '카테고리' : '', isAuthorFilterActive ? `작성자 ${urlAuthor}` : '', isDateFilterActive ? `작성일 ${fromDate || '시작 제한 없음'} ~ ${toDate || '종료 제한 없음'}` : ''].filter(Boolean).join(' · ')}
            </span>
            <button type="button" className="text-link" onClick={resetFilters}>필터 초기화</button>
          </div>
        )}
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
              <p>
                {selectedBoardId === 'all' ? '전체 게시판' : boards.find((board) => String(board.id) === selectedBoardId)?.name || '선택한 게시판'}에서 {results.length.toLocaleString('ko-KR')}개를 조회했고, 현재 조건에 맞는 {sortedResults.length.toLocaleString('ko-KR')}개를 표시합니다.
              </p>
            </div>
            <span className="global-search-result-count">{sortedResults.length.toLocaleString('ko-KR')}개</span>
          </div>

          {failedBoardCount > 0 && <p className="global-search-warning" role="status">{failedBoardCount}개 게시판에서 검색하지 못했습니다. 표시된 결과는 일부 게시판을 제외할 수 있습니다.</p>}
          {truncatedBoardCount > 0 && <p className="global-search-warning" role="status">{truncatedBoardCount}개 게시판에서 검색 결과가 100개를 초과했습니다. 해당 게시판의 추가 결과는 표시되지 않을 수 있습니다.</p>}

          {sortedResults.length === 0 ? (
            <EmptyState
              className="global-search-empty"
              icon="⌕"
              title={results.length > 0 ? '현재 조건에 맞는 결과가 없습니다.' : '검색 결과가 없습니다.'}
              description={results.length > 0 ? '작성자, 날짜 또는 카테고리 조건을 변경하거나 필터를 초기화해 보세요.' : '검색어를 바꾸거나 전체 게시판을 선택해 다시 검색해 보세요.'}
            >
              {results.length > 0 ? (
                <button type="button" className="button button-secondary button-small" onClick={resetFilters}>필터 초기화</button>
              ) : (
                <button type="button" className="button button-secondary button-small" onClick={() => { setKeywordInput(''); setSearchParams({}) }}>검색어 지우기</button>
              )}
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
                <button type="button" className="button button-secondary button-small" onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 0}>이전</button>
                <span aria-live="polite">{currentPage + 1} / {totalPages} 페이지</span>
                <button type="button" className="button button-secondary button-small" onClick={() => changePage(currentPage + 1)} disabled={currentPage + 1 >= totalPages}>다음</button>
              </nav>
            </>
          )}
        </section>
      )}

      {!queryFromUrl && !boardsError && !isLoadingBoards && (
        <EmptyState className="global-search-empty global-search-intro" icon="⌕" title="게시글을 통합 검색해 보세요." description="검색어를 입력하면 선택한 범위에서 제목과 내용이 일치하는 게시글을 찾고, 작성자와 기간 조건으로 다시 좁힐 수 있습니다.">
          <Link to="/boards" className="button button-primary button-small">게시판 둘러보기</Link>
        </EmptyState>
      )}
    </main>
  )
}
