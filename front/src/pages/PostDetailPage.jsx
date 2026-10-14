import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export default function PostDetailPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <main className="post-page">
      <div className="post-breadcrumb"><Link to="/boards">게시판</Link><span aria-hidden="true">/</span><span>{post.categoryName || '전체 글'}</span></div>
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
          <div className="post-detail-stats"><span>조회 {post.viewCount ?? 0}</span><span>좋아요 {post.likeCount ?? 0}</span></div>
        </header>
        <div className="post-detail-content">{post.content}</div>
      </article>
      <div className="post-detail-actions">
        <Link to="/boards" className="button button-secondary">← 게시판 목록</Link>
        <Link to={`/boards/${post.boardId}/posts/new`} className="button button-primary">새 글 작성</Link>
      </div>
    </main>
  )
}
