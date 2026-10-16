import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ErrorMessage, LoadingState } from '../components/FeedbackState'
import PostContentField from '../components/PostContentField'
import { createPostDraftKey, readPostDraft, removePostDraft, savePostDraft } from '../utils/postDraftStorage'

function validatePost(title, content) {
  const errors = {}
  if (!title.trim()) errors.title = '제목을 입력해 주세요.'
  else if (title.trim().length > 200) errors.title = '제목은 200자 이하로 입력해 주세요.'
  if (!content.trim()) errors.content = '내용을 입력해 주세요.'
  return errors
}

export default function PostCreatePage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userIdentifier = user?.userId ?? user?.username
  const draftKey = useMemo(
    () => createPostDraftKey('create', boardId, userIdentifier),
    [boardId, userIdentifier],
  )
  const submitLock = useRef(false)
  const [board, setBoard] = useState(null)
  const [categories, setCategories] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loadVersion, setLoadVersion] = useState(0)
  const [draftPersistenceReady, setDraftPersistenceReady] = useState(false)
  const [draftLoadedForKey, setDraftLoadedForKey] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)
  const [draftStorageStatus, setDraftStorageStatus] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadFormData() {
      setIsLoading(true)
      setError('')
      setBoard(null)
      setCategories([])
      setFieldErrors({})
      setDraftPersistenceReady(false)
      setDraftLoadedForKey('')
      setDraftRestored(false)
      setDraftStorageStatus('')
      try {
        const [boardData, categoryData] = await Promise.all([
          boardApi.getBoards(),
          boardApi.getCategories(boardId),
        ])
        const safeBoards = Array.isArray(boardData) ? boardData : []
        const selectedBoard = safeBoards.find((item) => String(item.id) === String(boardId))
        if (!selectedBoard) throw new Error('선택한 게시판을 찾을 수 없습니다.')
        if (!cancelled) {
          const savedDraft = readPostDraft(draftKey)
          const safeCategories = Array.isArray(categoryData) ? categoryData : []
          const restoredCategoryId = savedDraft?.categoryId
            && safeCategories.some((category) => String(category.id) === savedDraft.categoryId)
            ? savedDraft.categoryId
            : ''
          setBoard(selectedBoard)
          setCategories(safeCategories)
          setTitle(savedDraft?.title ?? '')
          setContent(savedDraft?.content ?? '')
          setCategoryId(restoredCategoryId)
          setDraftRestored(Boolean(savedDraft))
          setDraftLoadedForKey(draftKey)
          setDraftPersistenceReady(true)
        }
      } catch (requestError) {
        if (!cancelled) setError(getErrorMessage(requestError, '작성 화면을 준비하지 못했습니다.'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadFormData()
    return () => { cancelled = true }
  }, [boardId, draftKey, loadVersion])

  useEffect(() => {
    if (!draftPersistenceReady || draftLoadedForKey !== draftKey || !board || !draftKey) return
    const hasInput = Boolean(title.trim() || content.trim() || categoryId)
    if (!hasInput) {
      removePostDraft(draftKey)
      setDraftStorageStatus('')
      return
    }

    const saved = savePostDraft(draftKey, { title, content, categoryId })
    setDraftStorageStatus(saved
      ? '작성 내용이 현재 브라우저 탭에 임시 저장되었습니다.'
      : '임시 저장 공간을 사용할 수 없습니다. 현재 화면의 입력 내용은 유지됩니다.')
  }, [draftPersistenceReady, draftLoadedForKey, board, draftKey, title, content, categoryId])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitLock.current) return
    setError('')

    const validationErrors = validatePost(title, content)
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      const firstInvalidField = validationErrors.title ? 'post-title' : 'post-content'
      document.getElementById(firstInvalidField)?.focus()
      return
    }

    submitLock.current = true
    setIsSubmitting(true)
    try {
      const created = await boardApi.createPost(boardId, {
        title: title.trim(),
        content: content.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
      })
      removePostDraft(draftKey)
      setDraftPersistenceReady(false)
      navigate(`/posts/${created.id}`, { replace: true })
    } catch (requestError) {
      setError(`${getErrorMessage(requestError, '게시글 작성에 실패했습니다.')} 입력 내용은 유지되며, 임시 저장이 가능하면 현재 탭에 보관됩니다.`)
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  function updateTitle(value) {
    setTitle(value)
    setError('')
    setFieldErrors((current) => ({ ...current, title: '' }))
  }

  function updateContent(value) {
    setContent(value)
    setError('')
    setFieldErrors((current) => ({ ...current, content: '' }))
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
        {draftRestored && <div className="post-draft-notice" role="status">이전에 작성하던 임시 저장 내용을 복원했습니다.</div>}
        <p className="post-draft-status" role="status">{draftStorageStatus || '입력 내용은 현재 브라우저 탭에 임시 저장됩니다. 게시글 등록에 성공하면 삭제됩니다.'}</p>
        {error && <ErrorMessage className="boards-alert milestone-19-form-error">{error}</ErrorMessage>}
        <form className="post-create-form" onSubmit={handleSubmit} aria-busy={isSubmitting} noValidate>
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
            onChange={(event) => updateTitle(event.target.value)}
            placeholder="제목을 입력해 주세요"
            aria-describedby={`post-title-help${fieldErrors.title ? ' post-title-error' : ''}`}
            aria-invalid={Boolean(fieldErrors.title)}
            required
            disabled={isSubmitting}
          />
          <div id="post-title-help" className="post-input-hint">{title.length} / 200자</div>
          {fieldErrors.title && <p id="post-title-error" className="post-field-error" role="alert">{fieldErrors.title}</p>}

          <label htmlFor="post-content">내용 <span className="form-required">필수</span></label>
          <PostContentField id="post-content" value={content} onChange={updateContent} disabled={isSubmitting} error={fieldErrors.content || ''} />

          <div className="post-form-actions">
            <button type="button" className="button button-secondary" onClick={() => navigate('/boards')} disabled={isSubmitting}>취소</button>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? '등록 중...' : '게시글 등록'}</button>
          </div>
        </form>
      </section>
    </main>
  )
}
