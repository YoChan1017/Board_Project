import { useCallback, useEffect, useMemo, useState } from 'react'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState, SuccessMessage } from './FeedbackState'

const THREADS_PER_PAGE = 8

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

function handleSubmitShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }
}

export default function CommentsSection({ postId, user }) {
  const [comments, setComments] = useState([])
  const [newContent, setNewContent] = useState('')
  const [replyToId, setReplyToId] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyCommentId, setBusyCommentId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
    setPage(0)
    setSearchInput('')
    setSearchQuery('')
    setNotice('')
    setNewContent('')
    setReplyToId(null)
    setReplyContent('')
    setEditingCommentId(null)
    setEditingContent('')
    loadComments()
  }, [postId, loadComments])

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

  const filteredRoots = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('ko-KR')
    if (!query) return roots

    function threadMatches(comment) {
      const author = String(comment.authorNickname ?? '').toLocaleLowerCase('ko-KR')
      const content = String(comment.content ?? '').toLocaleLowerCase('ko-KR')
      if (author.includes(query) || content.includes(query)) return true
      const children = childrenByParent.get(String(comment.id)) ?? []
      return children.some(threadMatches)
    }

    return roots.filter(threadMatches)
  }, [roots, childrenByParent, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredRoots.length / THREADS_PER_PAGE))
  const pageRoots = filteredRoots.slice(page * THREADS_PER_PAGE, (page + 1) * THREADS_PER_PAGE)

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, totalPages - 1)))
  }, [totalPages])

  function handleSearch(event) {
    event.preventDefault()
    setPage(0)
    setSearchQuery(searchInput.trim())
  }

  function clearSearch() {
    setSearchInput('')
    setSearchQuery('')
    setPage(0)
  }

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
    setNotice('')
    try {
      await boardApi.createComment(postId, { content, parentId })
      if (parentId == null) {
        setNewContent('')
        setSearchInput('')
        setSearchQuery('')
        setPage(0)
        setNotice('댓글을 등록했습니다.')
      } else {
        setReplyContent('')
        setReplyToId(null)
        setNotice('답글을 등록했습니다.')
      }
      await loadComments()
    } catch (requestError) {
      setError(getErrorMessage(requestError, parentId == null ? '댓글 등록에 실패했습니다.' : '답글 등록에 실패했습니다.'))
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
    setNotice('')
    try {
      await boardApi.updateComment(commentId, { content })
      setEditingCommentId(null)
      setEditingContent('')
      setNotice('댓글을 수정했습니다.')
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
    setNotice('')
    try {
      await boardApi.deleteComment(comment.id)
      if (String(replyToId) === String(comment.id)) setReplyToId(null)
      if (String(editingCommentId) === String(comment.id)) setEditingCommentId(null)
      setNotice('댓글을 삭제했습니다.')
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
            <button type="button" className="comment-action" onClick={() => { setReplyToId(isReplying ? null : comment.id); setReplyContent(''); setEditingCommentId(null); setError(''); setNotice('') }}>답글</button>
            {canManage && <button type="button" className="comment-action" onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content); setReplyToId(null); setError(''); setNotice('') }}>수정</button>}
            {canManage && <button type="button" className="comment-action comment-action-danger" disabled={busyCommentId !== null || isSubmitting} onClick={() => handleDelete(comment)}>{isBusy ? '삭제 중...' : '삭제'}</button>}
          </div>
        </div>

        {isEditing ? (
          <div className="comment-edit-form">
            <label className="visually-hidden" htmlFor={`comment-edit-${comment.id}`}>댓글 수정 내용</label>
            <textarea
              id={`comment-edit-${comment.id}`}
              rows={3}
              maxLength={1000}
              value={editingContent}
              onChange={(event) => setEditingContent(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault()
                  handleSaveEdit(comment.id)
                }
              }}
            />
            <div className="comment-form-actions">
              <span className="comment-character-count">{editingContent.length} / 1000자</span>
              <span className="comment-shortcut-hint">Ctrl/⌘ + Enter 저장</span>
              <button type="button" className="button button-secondary button-small" onClick={() => { setEditingCommentId(null); setEditingContent('') }}>취소</button>
              <button type="button" className="button button-primary button-small" disabled={busyCommentId !== null} onClick={() => handleSaveEdit(comment.id)}>{isBusy ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        ) : (
          <p className="comment-content">{comment.content}</p>
        )}

        {isReplying && (
          <form className="comment-reply-form" onSubmit={(event) => handleCreate(event, comment.id)}>
            <label className="visually-hidden" htmlFor={`comment-reply-${comment.id}`}>답글 내용</label>
            <textarea
              id={`comment-reply-${comment.id}`}
              rows={3}
              maxLength={1000}
              value={replyContent}
              onChange={(event) => setReplyContent(event.target.value)}
              onKeyDown={handleSubmitShortcut}
              placeholder={`${comment.authorNickname || '작성자'}님에게 답글 작성`}
              aria-describedby={`comment-reply-help-${comment.id}`}
              required
            />
            <div className="comment-form-actions">
              <span className="comment-character-count">{replyContent.length} / 1000자</span>
              <span className="comment-shortcut-hint" id={`comment-reply-help-${comment.id}`}>Ctrl/⌘ + Enter 등록</span>
              <button type="button" className="button button-secondary button-small" onClick={() => { setReplyToId(null); setReplyContent('') }}>취소</button>
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
        <div><span className="panel-kicker">DISCUSSION</span><h2 id="comments-heading">댓글 <span>{comments.length.toLocaleString('ko-KR')}</span></h2></div>
        <button type="button" className="button button-secondary button-small" onClick={() => { setNotice(''); loadComments() }} disabled={isLoading}>새로고침</button>
      </div>

      {error && <ErrorMessage className="boards-alert comment-alert">{error}</ErrorMessage>}
      {notice && <SuccessMessage className="comment-notice">{notice}</SuccessMessage>}

      <form className="comment-create-form" onSubmit={(event) => handleCreate(event)}>
        <label htmlFor={`new-comment-${postId}`}>댓글 작성</label>
        <textarea
          id={`new-comment-${postId}`}
          rows={3}
          maxLength={1000}
          value={newContent}
          onChange={(event) => setNewContent(event.target.value)}
          onKeyDown={handleSubmitShortcut}
          placeholder="게시글에 대한 의견을 남겨 주세요."
          aria-describedby={`new-comment-help-${postId}`}
          required
        />
        <div className="comment-form-actions">
          <span className="comment-character-count">{newContent.length} / 1000자</span>
          <span className="comment-shortcut-hint" id={`new-comment-help-${postId}`}>Ctrl/⌘ + Enter 등록</span>
          <button type="submit" className="button button-primary button-small" disabled={isSubmitting}>{isSubmitting ? '등록 중...' : '댓글 등록'}</button>
        </div>
      </form>

      <div className="comment-browser">
        <form className="comment-search-form" role="search" onSubmit={handleSearch}>
          <label className="visually-hidden" htmlFor={`comment-search-${postId}`}>댓글 검색</label>
          <input
            id={`comment-search-${postId}`}
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="댓글 내용 또는 작성자 검색"
          />
          <button type="submit" className="button button-secondary button-small" disabled={isLoading}>검색</button>
          {(searchInput || searchQuery) && <button type="button" className="button button-secondary button-small" onClick={() => { clearSearch(); setNotice('') }}>초기화</button>}
        </form>
        {searchQuery && <p className="comment-search-summary" aria-live="polite">“{searchQuery}” 검색 · {filteredRoots.length.toLocaleString('ko-KR')}개 댓글 스레드</p>}
      </div>

      <div className="comment-list" aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <LoadingState className="boards-state">댓글을 불러오는 중입니다...</LoadingState>
        ) : comments.length === 0 ? (
          <EmptyState className="comments-empty" icon="✎" title="아직 댓글이 없습니다." description="첫 번째 댓글을 남겨 보세요." />
        ) : filteredRoots.length === 0 ? (
          <EmptyState className="comments-empty comment-filter-empty" icon="⌕" title="검색 결과가 없습니다." description="다른 검색어를 입력하거나 검색을 초기화해 보세요.">
            <button type="button" className="button button-secondary button-small" onClick={clearSearch}>검색 초기화</button>
          </EmptyState>
        ) : (
          <>
            <div className="comment-thread-summary">
              <span>{(page * THREADS_PER_PAGE + 1).toLocaleString('ko-KR')}–{Math.min((page + 1) * THREADS_PER_PAGE, filteredRoots.length).toLocaleString('ko-KR')} / {filteredRoots.length.toLocaleString('ko-KR')}개 스레드</span>
              <span>답글은 원 댓글과 함께 표시됩니다.</span>
            </div>
            {pageRoots.map((comment) => renderComment(comment))}
            {totalPages > 1 && (
              <nav className="comment-pagination" aria-label="댓글 페이지">
                <button type="button" className="button button-secondary button-small" disabled={page <= 0 || isLoading} onClick={() => setPage((current) => Math.max(0, current - 1))}>이전</button>
                <span aria-live="polite">{page + 1} / {totalPages} 페이지</span>
                <button type="button" className="button button-secondary button-small" disabled={page + 1 >= totalPages || isLoading} onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}>다음</button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  )
}
