import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ErrorMessage, LoadingState } from '../components/FeedbackState'
import PostContentField from '../components/PostContentField'
import { createPostDraftKey, readPostDraft, removePostDraft, savePostDraft } from '../utils/postDraftStorage'

function isAdmin(user) {
  return ['ADMIN', 'ROLE_ADMIN'].includes(user?.role)
}

function validatePost(title, content) {
  const errors = {}
  if (!title.trim()) errors.title = '제목을 입력해 주세요.'
  else if (title.trim().length > 200) errors.title = '제목은 200자 이하로 입력해 주세요.'
  if (!content.trim()) errors.content = '내용을 입력해 주세요.'
  return errors
}

export default function PostEditPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userIdentifier = user?.userId ?? user?.username
  const draftKey = useMemo(
    () => createPostDraftKey('edit', postId, userIdentifier),
    [postId, userIdentifier],
  )
  const submitLock = useRef(false)
  const [post, setPost] = useState(null)
  const [categories, setCategories] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [accessDenied, setAccessDenied] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)
  const [draftPersistenceReady, setDraftPersistenceReady] = useState(false)
  const [draftLoadedForKey, setDraftLoadedForKey] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)
  const [draftStorageStatus, setDraftStorageStatus] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadEditData() {
      setIsLoading(true)
      setError('')
      setPost(null)
      setCategories([])
      setFieldErrors({})
      setAccessDenied(false)
      setDraftPersistenceReady(false)
      setDraftLoadedForKey('')
      setDraftRestored(false)
      setDraftStorageStatus('')
      try {
        const data = await boardApi.getPost(postId)
        const canManage = String(user?.userId) === String(data.authorId) || isAdmin(user)
        if (!canManage) {
          if (!cancelled) {
            setPost(data)
            setAccessDenied(true)
            setError('게시글 작성자 또는 관리자만 수정할 수 있습니다.')
          }
          return
        }

        const categoryData = await boardApi.getCategories(data.boardId)
        if (!cancelled) {
          const savedDraft = readPostDraft(draftKey)
          const safeCategories = Array.isArray(categoryData) ? categoryData : []
          const originalTitle = data.title ?? ''
          const originalContent = data.content ?? ''
          const originalCategoryId = data.categoryId == null ? '' : String(data.categoryId)
          const restoredCategoryId = savedDraft && (
            !savedDraft.categoryId
            || safeCategories.some((category) => String(category.id) === savedDraft.categoryId)
          ) ? savedDraft.categoryId : originalCategoryId
          const hasDifferentDraft = Boolean(savedDraft && (
            savedDraft.title !== originalTitle
            || savedDraft.content !== originalContent
            || restoredCategoryId !== originalCategoryId
          ))

          setPost(data)
          setCategories(safeCategories)
          setTitle(hasDifferentDraft ? savedDraft.title : originalTitle)
          setContent(hasDifferentDraft ? savedDraft.content : originalContent)
          setCategoryId(hasDifferentDraft ? restoredCategoryId : originalCategoryId)
          setDraftRestored(hasDifferentDraft)
          setDraftLoadedForKey(draftKey)
          setDraftPersistenceReady(true)
        }
      } catch (requestError) {
        if (!cancelled) {
          if (requestError.response?.status === 403) {
            setAccessDenied(true)
            setError('이 게시글을 수정할 권한이 없습니다.')
          } else {
            setError(getErrorMessage(requestError, '수정할 게시글을 불러오지 못했습니다.'))
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadEditData()
    return () => { cancelled = true }
  }, [postId, user?.userId, user?.username, user?.role, draftKey, loadVersion])

  useEffect(() => {
    if (!draftPersistenceReady || draftLoadedForKey !== draftKey || !post || accessDenied || !draftKey) return
    const matchesOriginal = title === (post.title ?? '')
      && content === (post.content ?? '')
      && categoryId === (post.categoryId == null ? '' : String(post.categoryId))

    if (matchesOriginal) {
      removePostDraft(draftKey)
      setDraftStorageStatus('')
      return
    }

    const saved = savePostDraft(draftKey, { title, content, categoryId })
    setDraftStorageStatus(saved
      ? '수정 내용이 현재 브라우저 탭에 임시 저장되었습니다.'
      : '임시 저장 공간을 사용할 수 없습니다. 현재 화면의 입력 내용은 유지됩니다.')
  }, [draftPersistenceReady, draftLoadedForKey, post, accessDenied, draftKey, title, content, categoryId])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitLock.current) return
    setError('')

    const validationErrors = validatePost(title, content)
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      const firstInvalidField = validationErrors.title ? 'edit-post-title' : 'edit-post-content'
      document.getElementById(firstInvalidField)?.focus()
      return
    }

    submitLock.current = true
    setIsSubmitting(true)
    try {
      await boardApi.updatePost(postId, {
        title: title.trim(),
        content: content.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
      })
      removePostDraft(draftKey)
      setDraftPersistenceReady(false)
      navigate(`/posts/${postId}`, { replace: true })
    } catch (requestError) {
      setError(`${getErrorMessage(requestError, '게시글 수정에 실패했습니다.')} 입력 내용은 유지되며, 임시 저장이 가능하면 현재 탭에 보관됩니다.`)
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
        <LoadingState className="boards-state milestone-19-page-state">수정할 게시글을 불러오는 중입니다...</LoadingState>
      </main>
    )
  }

  if (accessDenied) {
    return (
      <main className="post-page">
        <section className="post-error milestone-19-feedback-card" aria-labelledby="post-edit-access-title" role="alert">
          <span className="eyebrow">ACCESS RESTRICTED</span>
          <h1 id="post-edit-access-title">게시글을 수정할 권한이 없습니다.</h1>
          <p>{error || '게시글 작성자 또는 관리자만 수정할 수 있습니다.'}</p>
          <div className="milestone-19-state-actions">
            {post && <Link to={`/posts/${postId}`} className="button button-primary">게시글로 돌아가기</Link>}
            <Link to="/boards" className="button button-secondary">게시판 목록</Link>
          </div>
        </section>
      </main>
    )
  }

  if (!post) {
    return (
      <main className="post-page">
        <section className="post-error milestone-19-feedback-card" aria-labelledby="post-edit-unavailable-title">
          <span className="eyebrow">POST EDIT UNAVAILABLE</span>
          <h1 id="post-edit-unavailable-title">수정할 게시글을 불러올 수 없습니다.</h1>
          <ErrorMessage
            className="milestone-19-state-error"
            actionLabel="다시 시도"
            onAction={() => setLoadVersion((current) => current + 1)}
          >
            {error || '게시글 정보를 불러오지 못했습니다.'}
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
      <div className="post-breadcrumb"><Link to="/boards">게시판</Link><span aria-hidden="true">/</span><Link to={`/posts/${postId}`}>게시글</Link><span aria-hidden="true">/</span><span>수정</span></div>
      <section className="post-form-card">
        <div className="post-form-heading">
          <span className="eyebrow"><span className="eyebrow-dot" /> EDIT POST</span>
          <h1>게시글 수정</h1>
          <p>수정 사항을 확인한 뒤 저장해 주세요.</p>
        </div>
        {draftRestored && <div className="post-draft-notice" role="status">저장되지 않은 이전 수정 내용을 복원했습니다. 게시글을 저장하면 임시 저장 내용이 삭제됩니다.</div>}
        <p className="post-draft-status" role="status">{draftStorageStatus || '내용을 변경하면 현재 브라우저 탭에 임시 저장됩니다. 수정 성공 시 삭제됩니다.'}</p>
        {error && <ErrorMessage className="boards-alert milestone-19-form-error">{error}</ErrorMessage>}
        <form className="post-create-form" onSubmit={handleSubmit} aria-busy={isSubmitting} noValidate>
          <label htmlFor="edit-post-category">카테고리 <span className="form-optional">선택</span></label>
          <select id="edit-post-category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setError('') }} disabled={isSubmitting}>
            <option value="">카테고리 없음</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>

          <label htmlFor="edit-post-title">제목 <span className="form-required">필수</span></label>
          <input
            id="edit-post-title"
            type="text"
            maxLength={200}
            value={title}
            onChange={(event) => updateTitle(event.target.value)}
            placeholder="제목을 입력해 주세요"
            aria-describedby={`edit-post-title-help${fieldErrors.title ? ' edit-post-title-error' : ''}`}
            aria-invalid={Boolean(fieldErrors.title)}
            required
            disabled={isSubmitting}
          />
          <div id="edit-post-title-help" className="post-input-hint">{title.length} / 200자</div>
          {fieldErrors.title && <p id="edit-post-title-error" className="post-field-error" role="alert">{fieldErrors.title}</p>}

          <label htmlFor="edit-post-content">내용 <span className="form-required">필수</span></label>
          <PostContentField id="edit-post-content" value={content} onChange={updateContent} disabled={isSubmitting} error={fieldErrors.content || ''} />

          <div className="post-form-actions">
            <button type="button" className="button button-secondary" onClick={() => navigate(`/posts/${postId}`)} disabled={isSubmitting}>취소</button>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '수정 내용 저장'}</button>
          </div>
        </form>
      </section>
    </main>
  )
}
