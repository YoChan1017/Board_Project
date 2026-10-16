import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { ErrorMessage, LoadingState } from '../components/FeedbackState'
import PostContentField from '../components/PostContentField'

export default function PostCreatePage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState(null)
  const [categories, setCategories] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadVersion, setLoadVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadFormData() {
      setIsLoading(true)
      setError('')
      setBoard(null)
      setCategories([])
      try {
        const [boardData, categoryData] = await Promise.all([
          boardApi.getBoards(),
          boardApi.getCategories(boardId),
        ])
        const safeBoards = Array.isArray(boardData) ? boardData : []
        const selectedBoard = safeBoards.find((item) => String(item.id) === String(boardId))
        if (!selectedBoard) throw new Error('선택한 게시판을 찾을 수 없습니다.')
        if (!cancelled) {
          setBoard(selectedBoard)
          setCategories(Array.isArray(categoryData) ? categoryData : [])
        }
      } catch (requestError) {
        if (!cancelled) setError(getErrorMessage(requestError, '작성 화면을 준비하지 못했습니다.'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadFormData()
    return () => { cancelled = true }
  }, [boardId, loadVersion])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해 주세요.')
      return
    }
    if (title.trim().length > 200) {
      setError('제목은 200자 이하로 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await boardApi.createPost(boardId, {
        title: title.trim(),
        content: content.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
      })
      navigate(`/posts/${created.id}`, { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError, '게시글 작성에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="post-page">
        <LoadingState className="boards-state milestone-19-page-state">작성 화면을 준비하고 있습니다...</LoadingState>
      </main>
    )
  }

  if (!board) {
    return (
      <main className="post-page">
        <section className="post-error milestone-19-feedback-card" aria-labelledby="post-create-unavailable-title">
          <span className="eyebrow">POST CREATION UNAVAILABLE</span>
          <h1 id="post-create-unavailable-title">게시판을 열 수 없습니다.</h1>
          <ErrorMessage
            className="milestone-19-state-error"
            actionLabel="다시 시도"
            onAction={() => setLoadVersion((current) => current + 1)}
          >
            {error || '게시판 정보를 불러오지 못했습니다.'}
          </ErrorMessage>
          <div className="milestone-19-state-actions">
            <Link to="/boards" className="button button-secondary">게시판으로 돌아가기</Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="post-page">
      <div className="post-breadcrumb"><Link to="/boards">게시판</Link><span aria-hidden="true">/</span><span>{board.name}</span><span aria-hidden="true">/</span><span>글쓰기</span></div>
      <section className="post-form-card">
        <div className="post-form-heading"><span className="eyebrow"><span className="eyebrow-dot" /> WRITE A POST</span><h1>새 게시글 작성</h1><p>{board.name} 게시판에 새 글을 등록합니다.</p></div>
        {error && <ErrorMessage className="boards-alert milestone-19-form-error">{error}</ErrorMessage>}
        <form className="post-create-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <label htmlFor="post-category">카테고리 <span className="form-optional">선택</span></label>
          <select id="post-category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setError('') }} disabled={isSubmitting}>
            <option value="">카테고리 없음</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>

          <label htmlFor="post-title">제목 <span className="form-required">필수</span></label>
          <input
            id="post-title"
            type="text"
            maxLength={200}
            value={title}
            onChange={(event) => { setTitle(event.target.value); setError('') }}
            placeholder="제목을 입력해 주세요"
            aria-describedby="post-title-help"
            required
            disabled={isSubmitting}
          />
          <div id="post-title-help" className="post-input-hint">{title.length} / 200자</div>

          <label htmlFor="post-content">내용 <span className="form-required">필수</span></label>
          <PostContentField id="post-content" value={content} onChange={(value) => { setContent(value); setError('') }} disabled={isSubmitting} />

          <div className="post-form-actions">
            <Link to="/boards" className="button button-secondary">취소</Link>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? '등록 중...' : '게시글 등록'}</button>
          </div>
        </form>
      </section>
    </main>
  )
}
