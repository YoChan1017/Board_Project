import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CommentsSection from '../components/CommentsSection'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function isAdmin(user) {
  return ['ADMIN', 'ROLE_ADMIN'].includes(user?.role)
}

export default function PostDetailPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [likeStatus, setLikeStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChangingLike, setIsChangingLike] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [likeError, setLikeError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadPost() {
      setIsLoading(true)
      setError('')
      try {
        const data = await boardApi.getPost(postId)
        if (!cancelled) setPost(data)
      } catch (requestError) {
        if (!cancelled) setError(getErrorMessage(requestError, '게시글을 불러오지 못했습니다.'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadPost()
    return () => { cancelled = true }
  }, [postId])

  useEffect(() => {
    let cancelled = false
    async function loadLikeStatus() {
      setLikeError('')
      setLikeStatus(null)
      try {
        const data = await boardApi.getLikeStatus(postId)
        if (!cancelled) setLikeStatus(data)
      } catch (requestError) {
        if (!cancelled) setLikeError(getErrorMessage(requestError, '좋아요 상태를 확인하지 못했습니다.'))
      }
    }
    loadLikeStatus()
    return () => { cancelled = true }
  }, [postId])

  async function handleLikeToggle() {
    setIsChangingLike(true)
    setLikeError('')
    try {
      const result = likeStatus?.likedByMe
        ? await boardApi.removeLike(postId)
        : await boardApi.addLike(postId)
      setLikeStatus(result)
      setPost((current) => current ? { ...current, likeCount: result.likeCount } : current)
    } catch (requestError) {
      setLikeError(getErrorMessage(requestError, '좋아요 처리에 실패했습니다.'))
    } finally {
      setIsChangingLike(false)
    }
  }

  async function handleDeletePost() {
    const confirmed = window.confirm('게시글을 삭제할까요? 삭제한 게시글은 목록에서 더 이상 표시되지 않습니다.')
    if (!confirmed) return

    setIsDeleting(true)
    setActionError('')
    try {
      await boardApi.deletePost(postId)
      navigate('/boards', { replace: true })
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, '게시글 삭제에 실패했습니다.'))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <main className="post-page"><div className="boards-state" role="status">게시글을 불러오는 중입니다...</div></main>
  }

  if (error || !post) {
    return (
      <main className="post-page">
        <section className="post-error" role="alert">
          <span className="eyebrow">POST UNAVAILABLE</span>
          <h1>게시글을 불러올 수 없습니다.</h1>
          <p>{error || '요청한 게시글이 존재하지 않습니다.'}</p>
          <button type="button" className="button button-primary" onClick={() => navigate('/boards')}>게시판으로 돌아가기</button>
        </section>
      </main>
    )
  }

  const canManagePost = String(user?.userId) === String(post.authorId) || isAdmin(user)
  const visibleLikeCount = likeStatus?.likeCount ?? post.likeCount ?? 0

  return (
    <main className="post-page">
      <div className="post-breadcrumb"><Link to="/boards">게시판</Link><span aria-hidden="true">/</span><span>{post.categoryName || '전체 글'}</span></div>
      {actionError && <div className="boards-alert" role="alert">{actionError}</div>}
      <article className="post-detail-card">
        <header className="post-detail-header">
          <div className="post-detail-labels">
            <span className="eyebrow"><span className="eyebrow-dot" /> POST DETAIL</span>
            {post.categoryName && <span className="category-tag">{post.categoryName}</span>}
          </div>
          <h1>{post.title}</h1>
          <div className="post-detail-meta">
            <span>작성자 <strong>{post.authorNickname || '알 수 없음'}</strong></span>
            <span>작성일 {formatDate(post.createdAt)}</span>
            {post.updatedAt && post.updatedAt !== post.createdAt && <span>수정일 {formatDate(post.updatedAt)}</span>}
          </div>
          <div className="post-detail-stats"><span>조회 {post.viewCount ?? 0}</span><span>좋아요 {visibleLikeCount}</span></div>
        </header>
        <div className="post-detail-content">{post.content}</div>
      </article>

      <div className="post-detail-toolbar">
        <button
          type="button"
          className={`button ${likeStatus?.likedByMe ? 'button-primary' : 'button-secondary'} like-button`}
          onClick={handleLikeToggle}
          disabled={isChangingLike || likeStatus === null}
          aria-pressed={Boolean(likeStatus?.likedByMe)}
          title={likeStatus === null ? '좋아요 상태를 불러오는 중입니다.' : undefined}
        >
          <span aria-hidden="true">{likeStatus?.likedByMe ? '♥' : '♡'}</span>
          {isChangingLike ? '처리 중...' : likeStatus?.likedByMe ? '좋아요 취소' : '좋아요'}
          <span className="like-count-pill">{visibleLikeCount}</span>
        </button>
        {likeError && <span className="like-error" role="status">{likeError}</span>}
        {canManagePost && (
          <div className="post-owner-actions">
            <Link to={`/posts/${post.id}/edit`} className="button button-secondary">수정</Link>
            <button type="button" className="button button-danger" onClick={handleDeletePost} disabled={isDeleting}>{isDeleting ? '삭제 중...' : '삭제'}</button>
          </div>
        )}
      </div>

      <CommentsSection postId={postId} user={user} />

      <div className="post-detail-actions">
        <Link to="/boards" className="button button-secondary">← 게시판 목록</Link>
        <Link to={`/boards/${post.boardId}/posts/new`} className="button button-primary">새 글 작성</Link>
      </div>
    </main>
  )
}
