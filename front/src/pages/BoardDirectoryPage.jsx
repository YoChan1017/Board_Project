import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState } from '../components/FeedbackState'

export default function BoardDirectoryPage() {
  const [boards, setBoards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const loadBoards = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await boardApi.getBoards()
      setBoards(Array.isArray(result) ? result : [])
    } catch (requestError) {
      setError(getErrorMessage(requestError, '게시판 목록을 불러오지 못했습니다.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const filteredBoards = boards.filter((board) => {
    if (!normalizedQuery) return true
    return [board.name, board.description].some((value) =>
      String(value ?? '').toLocaleLowerCase('ko-KR').includes(normalizedQuery),
    )
  })

  return (
    <main className="board-directory-page">
      <section className="board-directory-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> EXPLORE BOARDS</span>
        <h1>게시판 목록</h1>
        <p>관심 있는 게시판을 선택해 게시글을 확인하세요. 게시판이 늘어나도 목록에서 쉽게 찾아갈 수 있습니다.</p>
        <label className="board-directory-search-label" htmlFor="board-directory-search">게시판 검색</label>
        <input
          id="board-directory-search"
          className="board-directory-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="게시판 이름 또는 설명 검색"
        />
      </section>

      {isLoading ? (
        <LoadingState className="board-directory-state">게시판을 불러오는 중입니다...</LoadingState>
      ) : error ? (
        <ErrorMessage className="board-directory-state" actionLabel="다시 불러오기" onAction={loadBoards}>
          {error}
        </ErrorMessage>
      ) : filteredBoards.length === 0 ? (
        <EmptyState className="board-directory-state" title={boards.length ? '검색 결과가 없습니다.' : '등록된 게시판이 없습니다.'}>
          {boards.length ? '다른 검색어를 입력해 보세요.' : '관리자가 게시판을 등록하면 여기에 표시됩니다.'}
        </EmptyState>
      ) : (
        <section className="board-directory-grid" aria-label="게시판 목록">
          {filteredBoards.map((board) => (
            <article className="board-directory-card" key={board.id}>
              <div className="board-directory-card-icon" aria-hidden="true">B</div>
              <div className="board-directory-card-copy">
                <h2>{board.name}</h2>
                <p>{board.description?.trim() || '게시판 설명이 등록되지 않았습니다.'}</p>
              </div>
              <Link className="button button-primary board-directory-open" to={`/boards/${board.id}/posts`}>
                게시글 보기 <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
