import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export default function PostEditPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [categories, setCategories] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadEditData() {
      setIsLoading(true)
      setError('')
      try {
        const data = await boardApi.getPost(postId)
        const categoryData = await boardApi.getCategories(data.boardId)
        const canManage = String(user?.userId) === String(data.authorId) || ['ADMIN', 'ROLE_ADMIN'].includes(user?.role)

        if (!canManage) {
          throw new Error('게시글 작성자 또는 관리자만 수정할 수 있습니다.')
        }

        if (!cancelled) {
          setPost(data)
          setCategories(Array.isArray(categoryData) ? categoryData : [])
          setTitle(data.title ?? '')
          setContent(data.content ?? '')
          setCategoryId(data.categoryId == null ? '' : String(data.categoryId))
        }
      } catch (requestError) {
        if (!cancelled) setError(getErrorMessage(requestError, '수정할 게시글을 불러오지 못했습니다.'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadEditData()
    return () => { cancelled = true }
  }, [postId, user?.userId, user?.role])

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
      await boardApi.updatePost(postId, {
        title: title.trim(),
        content: content.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
      })
      navigate(`/posts/${postId}`, { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError, '게시글 수정에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <main className="post-page"><div className="boards-state" role="status">수정할 게시글을 불러오는 중입니다...</div></main>
  }

  if (!post) {
    return (
      <main className="post-page">
        <section className="post-error" role="alert">
          <span className="eyebrow">POST EDIT UNAVAILABLE</span>
          <h1>게시글을 수정할 수 없습니다.</h1>
          <p>{error || '게시글 정보를 찾을 수 없습니다.'}</p>
          <button type="button" className="button button-primary" onClick={() => navigate('/boards')}>게시판으로 돌아가기</button>
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
        {error && <div className="boards-alert" role="alert">{error}</div>}
        <form className="post-create-form" onSubmit={handleSubmit}>
          <label htmlFor="edit-post-category">카테고리 <span className="form-optional">선택</span></label>
          <select id="edit-post-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">카테고리 없음</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>

          <label htmlFor="edit-post-title">제목 <span className="form-required">필수</span></label>
          <input id="edit-post-title" type="text" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목을 입력해 주세요" required />
          <div className="post-input-hint">{title.length} / 200자</div>

          <label htmlFor="edit-post-content">내용 <span className="form-required">필수</span></label>
          <textarea id="edit-post-content" rows={14} value={content} onChange={(event) => setContent(event.target.value)} placeholder="게시글 내용을 입력해 주세요" required />
          <div className="post-form-actions">
            <Link to={`/posts/${postId}`} className="button button-secondary">취소</Link>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '수정 내용 저장'}</button>
          </div>
        </form>
      </section>
    </main>
  )
}
