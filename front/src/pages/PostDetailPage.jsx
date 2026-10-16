import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AttachmentsSection from '../components/AttachmentsSection'
import CommentsSection from '../components/CommentsSection'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ErrorMessage, LoadingState } from '../components/FeedbackState'
import { recordRecentPost } from '../utils/recentPostHistory'

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
  const userId = user?.userId
  const username = user?.username
  const [post, setPost] = useState(null)
  const [likeStatus, setLikeStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingLike, setIsLoadingLike] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChangingLike, setIsChangingLike] = useState(false)
  const [error, setError] = useState('')
  const [isNotFound, setIsNotFound] = useState(false)
  const [actionError, setActionError] = useState('')
  const [likeError, setLikeError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [postReloadVersion, setPostReloadVersion] = useState(0)
  const [likeReloadVersion, setLikeReloadVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadPost() {
      setIsLoading(true)
      setError('')
      setIsNotFound(false)
      setPost(null)
      try {
        const data = await boardApi.getPost(postId)
        if (!cancelled) setPost(data)
      } catch (requestError) {
        if (!cancelled) {
          if (requestError.response?.status === 404) {
            setIsNotFound(true)
            setError('게시글이 삭제되었거나 주소가 잘못되었을 수 있습니다.')
          } else {
            setError(getErrorMessage(requestError, '게시글을 불러오지 못했습니다.'))
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadPost()
    return () => { cancelled = true }
  }, [postId, postReloadVersion])

  // Save only lightweight metadata, scoped to the signed-in browser account.
  useEffect(() => {
    if (!post || (userId == null && !username)) return
    recordRecentPost({
      id: post.id,
      title: post.title,
      authorNickname: post.authorNickname,
      boardId: post.boardId,
      categoryName: post.categoryName,
      createdAt: post.createdAt,
    }, { userId, username })
  }, [post?.id, post?.title, post?.authorNickname, post?.boardId, post?.categoryName, post?.createdAt, userId, username])

  useEffect(() => {
    let cancelled = false

    async function loadLikeStatus() {
      setIsLoadingLike(true)
      setLikeError('')
      setLikeStatus(null)
      try {
        const data = await boardApi.getLikeStatus(postId)
        if (!cancelled) setLikeStatus(data)
      } catch (requestError) {
        if (!cancelled) setLikeError(getErrorMessage(requestError, '좋아요 상태를 확인하지 못했습니다.'))
      } finally {
        if (!cancelled) setIsLoadingLike(false)
      }
    }

    loadLikeStatus()
    return () => { cancelled = true }
  }, [postId, likeReloadVersion])

  async function handleCopyLink() {
    setCopyStatus('')
    if (!navigator.clipboard?.writeText) {
      setCopyStatus('이 브라우저에서는 자동 복사를 지원하지 않습니다. 주소창의 URL을 복사해 주세요.')
      return
    }

    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyStatus('게시글 링크를 복사했습니다.')
    } catch {
      setCopyStatus('링크 복사 권한이 없습니다. 주소창의 URL을 복사해 주세요.')
    }
  }

  async function handleLikeToggle() {
    if (!likeStatus || isChangingLike) return
    setIsChangingLike(true)
    setLikeError('')
    try {
      const result = likeStatus.likedByMe
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
    return (
      <main className="post-page">
        <LoadingState className="boards-state milestone-19-page-state">게시글을 불러오는 중입니다...</LoadingState>
      </main>
    )
  }

  if (isNotFound) {
    return (
      <main className="post-page">
        <EmptyState
          className="post-error milestone-19-feedback-card milestone-19-empty-state"
          icon="⌕"
          title="게시글을 찾을 수 없습니다."
          description={error || '게시글이 삭제되었거나 주소가 잘못되었을 수 있습니다.'}
        >
          <div className="milestone-19-state-actions">
            <Link to="/boards" className="button button-primary">게시판으로 돌아가기</Link>
          </div>
        </EmptyState>
      </main>
    )
  }

  if (error || !post) {
    return (
      <main className="post-page">
        <section className="post-error milestone-19-feedback-card" aria-labelledby="post-unavailable-title">
          <span className="eyebrow">POST UNAVAILABLE</span>
          <h1 id="post-unavailable-title">게시글을 불러올 수 없습니다.</h1>
          <ErrorMessage
            className="milestone-19-state-error"
            actionLabel="다시 불러오기"
            onAction={() => setPostReloadVersion((current) => current + 1)}
          >
            {error || '요청한 게시글을 불러오지 못했습니다.'}
          </ErrorMessage>
          <div className="milestone-19-state-actions">
            <Link to="/boards" className="button button-secondary">게시판 목록</Link>
          </div>
        </section>
      </main>
    )
  }

  const canManagePost = String(user?.userId) === String(post.authorId) || isAdmin(user)
  const visibleLikeCount = likeStatus?.likeCount ?? post.likeCount ?? 0

  return (
    <main className="post-page">
      <div className="post-detail-topline">
        <nav className="post-breadcrumb" aria-label="현재 위치">
          <Link to="/boards">게시판</Link><span aria-hidden="true">/</span><span>{post.categoryName || '전체 글'}</span>
        </nav>
        <div className="post-share-actions">
          <button type="button" className="button button-secondary button-small" onClick={handleCopyLink}>링크 복사</button>
          {copyStatus && <span className="post-copy-status" role="status" aria-live="polite">{copyStatus}</span>}
        </div>
      </div>
      {actionError && <ErrorMessage className="boards-alert milestone-19-action-error">{actionError}</ErrorMessage>}
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
          <div className="post-detail-stats"><span>조회 {(post.viewCount ?? 0).toLocaleString('ko-KR')}</span><span>좋아요 {visibleLikeCount.toLocaleString('ko-KR')}</span></div>
        </header>
        <div className="post-detail-content">{post.content}</div>
      </article>

      <AttachmentsSection postId={postId} canManage={canManagePost} />

      <div className="post-detail-toolbar">
        <button
          type="button"
          className={`button ${likeStatus?.likedByMe ? 'button-primary' : 'button-secondary'} like-button`}
          onClick={handleLikeToggle}
          disabled={isChangingLike || isLoadingLike || likeStatus === null}
          aria-pressed={Boolean(likeStatus?.likedByMe)}
          title={likeStatus === null ? '좋아요 상태를 확인 중입니다.' : undefined}
        >
          <span aria-hidden="true">{likeStatus?.likedByMe ? '♥' : '♡'}</span>
          {isChangingLike ? '처리 중...' : isLoadingLike ? '상태 확인 중...' : likeStatus?.likedByMe ? '좋아요 취소' : '좋아요'}
          <span className="like-count-pill">{visibleLikeCount}</span>
        </button>
        {likeError && (
          <ErrorMessage
            className="like-error-feedback"
            actionLabel="다시 확인"
            onAction={() => setLikeReloadVersion((current) => current + 1)}
          >
            {likeError}
          </ErrorMessage>
        )}
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
