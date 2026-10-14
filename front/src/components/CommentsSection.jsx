import { useCallback, useEffect, useMemo, useState } from 'react'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'

function formatCommentDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function canManageComment(comment, user) {
  return String(user?.userId) === String(comment.authorId)
    || ['ADMIN', 'ROLE_ADMIN'].includes(user?.role)
}

export default function CommentsSection({ postId, user }) {
  const [comments, setComments] = useState([])
  const [newContent, setNewContent] = useState('')
  const [replyToId, setReplyToId] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyCommentId, setBusyCommentId] = useState(null)
  const [error, setError] = useState('')

  const loadComments = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await boardApi.getComments(postId)
      setComments(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setError(getErrorMessage(requestError, '댓글 목록을 불러오지 못했습니다.'))
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const { childrenByParent, roots } = useMemo(() => {
    const byParent = new Map()
    const ids = new Set(comments.map((comment) => String(comment.id)))
    const rootItems = []

    for (const comment of comments) {
      const hasVisibleParent = comment.parentId != null && ids.has(String(comment.parentId))
      if (!hasVisibleParent) {
        rootItems.push(comment)
        continue
      }
      const key = String(comment.parentId)
      const siblings = byParent.get(key) ?? []
      siblings.push(comment)
      byParent.set(key, siblings)
    }

    return { childrenByParent: byParent, roots: rootItems }
  }, [comments])

  async function handleCreate(event, parentId = null) {
    event.preventDefault()
    const content = (parentId == null ? newContent : replyContent).trim()
    if (!content) {
      setError('댓글 내용을 입력해 주세요.')
      return
    }
    if (content.length > 1000) {
      setError('댓글은 1000자 이하로 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await boardApi.createComment(postId, { content, parentId })
      if (parentId == null) setNewContent('')
      else {
        setReplyContent('')
        setReplyToId(null)
      }
      await loadComments()
    } catch (requestError) {
      setError(getErrorMessage(requestError, '댓글 등록에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSaveEdit(commentId) {
    const content = editingContent.trim()
    if (!content) {
      setError('댓글 내용을 입력해 주세요.')
      return
    }
    if (content.length > 1000) {
      setError('댓글은 1000자 이하로 입력해 주세요.')
      return
    }

    setBusyCommentId(commentId)
    setError('')
    try {
      await boardApi.updateComment(commentId, { content })
      setEditingCommentId(null)
      setEditingContent('')
      await loadComments()
    } catch (requestError) {
      setError(getErrorMessage(requestError, '댓글 수정에 실패했습니다.'))
    } finally {
      setBusyCommentId(null)
    }
  }

  async function handleDelete(comment) {
    const confirmed = window.confirm('이 댓글을 삭제할까요?')
    if (!confirmed) return

    setBusyCommentId(comment.id)
    setError('')
    try {
      await boardApi.deleteComment(comment.id)
      if (String(replyToId) === String(comment.id)) setReplyToId(null)
      if (String(editingCommentId) === String(comment.id)) setEditingCommentId(null)
      await loadComments()
    } catch (requestError) {
      setError(getErrorMessage(requestError, '댓글 삭제에 실패했습니다.'))
    } finally {
      setBusyCommentId(null)
    }
  }

  function renderComment(comment, level = 0) {
    const canManage = canManageComment(comment, user)
    const childComments = childrenByParent.get(String(comment.id)) ?? []
    const isEditing = String(editingCommentId) === String(comment.id)
    const isReplying = String(replyToId) === String(comment.id)
    const isBusy = String(busyCommentId) === String(comment.id)

    return (
      <article className={`comment-item${level > 0 ? ' comment-reply' : ''}`} key={comment.id} style={{ marginLeft: `${Math.min(level, 3) * 20}px` }}>
        <div className="comment-head">
          <div className="comment-author-line">
            <strong>{comment.authorNickname || '알 수 없는 사용자'}</strong>
            <time dateTime={comment.createdAt || undefined}>{formatCommentDate(comment.createdAt)}</time>
            {comment.updatedAt && comment.updatedAt !== comment.createdAt && <span className="comment-edited-mark">수정됨</span>}
          </div>
          <div className="comment-actions">
            <button type="button" className="comment-action" onClick={() => { setReplyToId(isReplying ? null : comment.id); setReplyContent(''); setEditingCommentId(null) }}>답글</button>
            {canManage && <button type="button" className="comment-action" onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content); setReplyToId(null) }}>수정</button>}
            {canManage && <button type="button" className="comment-action comment-action-danger" disabled={isBusy} onClick={() => handleDelete(comment)}>삭제</button>}
          </div>
        </div>

        {isEditing ? (
          <div className="comment-edit-form">
            <label className="visually-hidden" htmlFor={`comment-edit-${comment.id}`}>댓글 수정 내용</label>
            <textarea id={`comment-edit-${comment.id}`} rows={3} maxLength={1000} value={editingContent} onChange={(event) => setEditingContent(event.target.value)} />
            <div className="comment-form-actions">
              <span className="comment-character-count">{editingContent.length} / 1000자</span>
              <button type="button" className="button button-secondary button-small" onClick={() => setEditingCommentId(null)}>취소</button>
              <button type="button" className="button button-primary button-small" disabled={isBusy} onClick={() => handleSaveEdit(comment.id)}>{isBusy ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        ) : (
          <p className="comment-content">{comment.content}</p>
        )}

        {isReplying && (
          <form className="comment-reply-form" onSubmit={(event) => handleCreate(event, comment.id)}>
            <label className="visually-hidden" htmlFor={`comment-reply-${comment.id}`}>답글 내용</label>
            <textarea id={`comment-reply-${comment.id}`} rows={3} maxLength={1000} value={replyContent} onChange={(event) => setReplyContent(event.target.value)} placeholder={`${comment.authorNickname || '작성자'}님에게 답글 작성`} required />
            <div className="comment-form-actions">
              <span className="comment-character-count">{replyContent.length} / 1000자</span>
              <button type="button" className="button button-secondary button-small" onClick={() => setReplyToId(null)}>취소</button>
              <button type="submit" className="button button-primary button-small" disabled={isSubmitting}>{isSubmitting ? '등록 중...' : '답글 등록'}</button>
            </div>
          </form>
        )}

        {childComments.length > 0 && <div className="comment-children">{childComments.map((child) => renderComment(child, level + 1))}</div>}
      </article>
    )
  }

  return (
    <section className="comments-panel" aria-labelledby="comments-heading">
      <div className="comments-heading-row">
        <div><span className="panel-kicker">DISCUSSION</span><h2 id="comments-heading">댓글 <span>{comments.length}</span></h2></div>
        <button type="button" className="button button-secondary button-small" onClick={loadComments} disabled={isLoading}>새로고침</button>
      </div>

      {error && <div className="boards-alert comment-alert" role="alert">{error}</div>}

      <form className="comment-create-form" onSubmit={(event) => handleCreate(event)}>
        <label htmlFor={`new-comment-${postId}`}>댓글 작성</label>
        <textarea id={`new-comment-${postId}`} rows={3} maxLength={1000} value={newContent} onChange={(event) => setNewContent(event.target.value)} placeholder="게시글에 대한 의견을 남겨 주세요." required />
        <div className="comment-form-actions">
          <span className="comment-character-count">{newContent.length} / 1000자</span>
          <button type="submit" className="button button-primary button-small" disabled={isSubmitting}>{isSubmitting ? '등록 중...' : '댓글 등록'}</button>
        </div>
      </form>

      <div className="comment-list" aria-live="polite">
        {isLoading ? <div className="boards-state">댓글을 불러오는 중입니다...</div> : comments.length === 0 ? (
          <div className="comments-empty"><span aria-hidden="true">✎</span><p>아직 댓글이 없습니다. 첫 번째 댓글을 남겨 보세요.</p></div>
        ) : roots.map((comment) => renderComment(comment))}
      </div>
    </section>
  )
}
