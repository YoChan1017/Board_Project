import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'

const EMPTY_BOARD = { name: '', description: '' }
const EMPTY_CATEGORY = { name: '' }

export default function AdminBoardManagementPage() {
  const [boards, setBoards] = useState([])
  const [selectedBoardId, setSelectedBoardId] = useState('')
  const [categories, setCategories] = useState([])
  const [boardFormMode, setBoardFormMode] = useState(null)
  const [editingBoardId, setEditingBoardId] = useState(null)
  const [boardDraft, setBoardDraft] = useState(EMPTY_BOARD)
  const [categoryFormMode, setCategoryFormMode] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [categoryDraft, setCategoryDraft] = useState(EMPTY_CATEGORY)
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isSavingBoard, setIsSavingBoard] = useState(false)
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedBoard = useMemo(
    () => boards.find((board) => String(board.id) === String(selectedBoardId)) ?? null,
    [boards, selectedBoardId],
  )

  const loadBoards = useCallback(async (preferredBoardId) => {
    setIsLoadingBoards(true)
    setError('')
    try {
      const result = await boardApi.getBoards()
      const safeBoards = Array.isArray(result) ? result : []
      setBoards(safeBoards)
      setSelectedBoardId((current) => {
        const target = preferredBoardId ?? current
        if (target && safeBoards.some((board) => String(board.id) === String(target))) {
          return String(target)
        }
        return safeBoards.length ? String(safeBoards[0].id) : ''
      })
    } catch (requestError) {
      setError(getErrorMessage(requestError, '게시판 목록을 불러오지 못했습니다.'))
    } finally {
      setIsLoadingBoards(false)
    }
  }, [])

  const loadCategories = useCallback(async (boardId) => {
    if (!boardId) {
      setCategories([])
      setIsLoadingCategories(false)
      return
    }

    setIsLoadingCategories(true)
    try {
      const result = await boardApi.getCategories(boardId)
      setCategories(Array.isArray(result) ? result : [])
    } catch (requestError) {
      setCategories([])
      setError(getErrorMessage(requestError, '카테고리 목록을 불러오지 못했습니다.'))
    } finally {
      setIsLoadingCategories(false)
    }
  }, [])

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  useEffect(() => {
    loadCategories(selectedBoardId)
  }, [selectedBoardId, loadCategories])

  function beginCreateBoard() {
    setError('')
    setNotice('')
    setEditingBoardId(null)
    setBoardDraft(EMPTY_BOARD)
    setBoardFormMode('create')
  }

  function beginEditBoard(board) {
    setError('')
    setNotice('')
    setEditingBoardId(board.id)
    setBoardDraft({ name: board.name ?? '', description: board.description ?? '' })
    setBoardFormMode('edit')
  }

  function cancelBoardForm() {
    setBoardFormMode(null)
    setEditingBoardId(null)
    setBoardDraft(EMPTY_BOARD)
  }

  async function handleBoardSubmit(event) {
    event.preventDefault()
    const name = boardDraft.name.trim()
    const description = boardDraft.description.trim()

    if (!name) {
      setError('게시판 이름을 입력해 주세요.')
      return
    }
    if (name.length > 100 || description.length > 255) {
      setError('게시판 이름은 100자, 설명은 255자 이하로 입력해 주세요.')
      return
    }

    setIsSavingBoard(true)
    setError('')
    setNotice('')
    try {
      if (boardFormMode === 'edit') {
        const updated = await boardApi.updateBoard(editingBoardId, { name, description })
        await loadBoards(updated?.id ?? editingBoardId)
        setNotice('게시판 정보를 수정했습니다.')
      } else {
        const created = await boardApi.createBoard({ name, description })
        await loadBoards(created?.id)
        setNotice('새 게시판을 만들었습니다.')
      }
      cancelBoardForm()
    } catch (requestError) {
      setError(getErrorMessage(requestError, '게시판 저장에 실패했습니다.'))
    } finally {
      setIsSavingBoard(false)
    }
  }

  async function handleBoardDelete(board) {
    const confirmed = window.confirm(
      `“${board.name}” 게시판을 삭제할까요? 게시판에 연결된 데이터 때문에 서버에서 삭제가 거부될 수 있습니다.`,
    )
    if (!confirmed) return

    setBusyAction(`board:${board.id}`)
    setError('')
    setNotice('')
    try {
      await boardApi.deleteBoard(board.id)
      if (String(editingBoardId) === String(board.id)) cancelBoardForm()
      await loadBoards('')
      setNotice('게시판을 삭제했습니다.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, '게시판 삭제에 실패했습니다.'))
    } finally {
      setBusyAction('')
    }
  }

  function beginCreateCategory() {
    if (!selectedBoard) return
    setError('')
    setNotice('')
    setEditingCategoryId(null)
    setCategoryDraft(EMPTY_CATEGORY)
    setCategoryFormMode('create')
  }

  function beginEditCategory(category) {
    setError('')
    setNotice('')
    setEditingCategoryId(category.id)
    setCategoryDraft({ name: category.name ?? '' })
    setCategoryFormMode('edit')
  }

  function cancelCategoryForm() {
    setCategoryFormMode(null)
    setEditingCategoryId(null)
    setCategoryDraft(EMPTY_CATEGORY)
  }

  async function handleCategorySubmit(event) {
    event.preventDefault()
    const name = categoryDraft.name.trim()
    if (!selectedBoard) {
      setError('카테고리를 관리할 게시판을 먼저 선택해 주세요.')
      return
    }
    if (!name) {
      setError('카테고리 이름을 입력해 주세요.')
      return
    }
    if (name.length > 100) {
      setError('카테고리 이름은 100자 이하로 입력해 주세요.')
      return
    }

    setIsSavingCategory(true)
    setError('')
    setNotice('')
    try {
      if (categoryFormMode === 'edit') {
        await boardApi.updateCategory(editingCategoryId, { name })
        setNotice('카테고리 이름을 수정했습니다.')
      } else {
        await boardApi.createCategory(selectedBoard.id, { name })
        setNotice('새 카테고리를 만들었습니다.')
      }
      cancelCategoryForm()
      await loadCategories(selectedBoard.id)
    } catch (requestError) {
      setError(getErrorMessage(requestError, '카테고리 저장에 실패했습니다.'))
    } finally {
      setIsSavingCategory(false)
    }
  }

  async function handleCategoryDelete(category) {
    const confirmed = window.confirm(
      `“${category.name}” 카테고리를 삭제할까요? 관련 게시글이 있다면 서버 정책에 따라 삭제가 거부될 수 있습니다.`,
    )
    if (!confirmed) return

    setBusyAction(`category:${category.id}`)
    setError('')
    setNotice('')
    try {
      await boardApi.deleteCategory(category.id)
      if (String(editingCategoryId) === String(category.id)) cancelCategoryForm()
      await loadCategories(selectedBoardId)
      setNotice('카테고리를 삭제했습니다.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, '카테고리 삭제에 실패했습니다.'))
    } finally {
      setBusyAction('')
    }
  }

  return (
    <main className="admin-board-page">
      <section className="admin-board-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> ADMINISTRATION</span>
        <h1>게시판 관리</h1>
        <p>게시판과 각 게시판의 카테고리를 생성·수정·삭제합니다.</p>
      </section>

      {error && <div className="boards-alert admin-feedback" role="alert"><span>{error}</span></div>}
      {notice && <div className="admin-notice" role="status"><span aria-hidden="true">✓</span>{notice}</div>}

      <div className="admin-management-grid">
        <section className="admin-panel" aria-labelledby="admin-board-list-heading">
          <div className="admin-panel-heading">
            <div>
              <span className="panel-kicker">BOARD SETTINGS</span>
              <h2 id="admin-board-list-heading">게시판 목록 <span className="admin-count">{boards.length}</span></h2>
            </div>
            <button type="button" className="button button-primary button-small" onClick={beginCreateBoard}>+ 게시판 추가</button>
          </div>

          {boardFormMode && (
            <form className="admin-edit-form" onSubmit={handleBoardSubmit}>
              <h3>{boardFormMode === 'edit' ? '게시판 수정' : '새 게시판'}</h3>
              <label htmlFor="admin-board-name">게시판 이름</label>
              <input id="admin-board-name" value={boardDraft.name} maxLength={100} onChange={(event) => setBoardDraft((current) => ({ ...current, name: event.target.value }))} placeholder="예: 자유게시판" required />
              <div className="admin-input-hint">{boardDraft.name.length} / 100자</div>
              <label htmlFor="admin-board-description">설명 <span className="form-optional">선택</span></label>
              <textarea id="admin-board-description" value={boardDraft.description} maxLength={255} rows={3} onChange={(event) => setBoardDraft((current) => ({ ...current, description: event.target.value }))} placeholder="게시판에 대한 짧은 설명" />
              <div className="admin-input-hint">{boardDraft.description.length} / 255자</div>
              <div className="admin-form-actions">
                <button type="button" className="button button-secondary button-small" onClick={cancelBoardForm} disabled={isSavingBoard}>취소</button>
                <button type="submit" className="button button-primary button-small" disabled={isSavingBoard}>{isSavingBoard ? '저장 중...' : '저장'}</button>
              </div>
            </form>
          )}

          {isLoadingBoards ? (
            <div className="boards-state" role="status">게시판 목록을 불러오는 중입니다...</div>
          ) : boards.length === 0 ? (
            <div className="admin-empty-state"><span aria-hidden="true">▤</span><strong>등록된 게시판이 없습니다.</strong><p>‘게시판 추가’를 눌러 첫 게시판을 만들어 주세요.</p></div>
          ) : (
            <div className="admin-board-list">
              {boards.map((board) => (
                <article className={`admin-board-item${String(board.id) === String(selectedBoardId) ? ' selected' : ''}`} key={board.id}>
                  <button type="button" className="admin-board-select" onClick={() => { setSelectedBoardId(String(board.id)); cancelCategoryForm(); setError(''); setNotice('') }} aria-pressed={String(board.id) === String(selectedBoardId)}>
                    <span className="admin-board-icon">B</span>
                    <span className="admin-board-copy"><strong>{board.name}</strong><small>{board.description || '설명이 없습니다.'}</small></span>
                    <span className="admin-board-chevron" aria-hidden="true">›</span>
                  </button>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-text-action" onClick={() => beginEditBoard(board)}>수정</button>
                    <button type="button" className="admin-text-action admin-text-danger" onClick={() => handleBoardDelete(board)} disabled={busyAction === `board:${board.id}`}>{busyAction === `board:${board.id}` ? '삭제 중...' : '삭제'}</button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="admin-panel-footer"><Link to="/boards" className="text-link">일반 게시판 보기 →</Link></div>
        </section>

        <section className="admin-panel" aria-labelledby="admin-category-heading">
          <div className="admin-panel-heading">
            <div>
              <span className="panel-kicker">CATEGORY SETTINGS</span>
              <h2 id="admin-category-heading">카테고리 관리</h2>
              <p className="admin-panel-subtitle">{selectedBoard ? `${selectedBoard.name} 게시판` : '게시판을 먼저 선택해 주세요.'}</p>
            </div>
            <button type="button" className="button button-primary button-small" onClick={beginCreateCategory} disabled={!selectedBoard}>+ 카테고리 추가</button>
          </div>

          {categoryFormMode && selectedBoard && (
            <form className="admin-edit-form" onSubmit={handleCategorySubmit}>
              <h3>{categoryFormMode === 'edit' ? '카테고리 수정' : '새 카테고리'}</h3>
              <label htmlFor="admin-category-name">카테고리 이름</label>
              <input id="admin-category-name" value={categoryDraft.name} maxLength={100} onChange={(event) => setCategoryDraft({ name: event.target.value })} placeholder="예: 공지, 질문, 팁" required />
              <div className="admin-input-hint">{categoryDraft.name.length} / 100자</div>
              <div className="admin-form-actions">
                <button type="button" className="button button-secondary button-small" onClick={cancelCategoryForm} disabled={isSavingCategory}>취소</button>
                <button type="submit" className="button button-primary button-small" disabled={isSavingCategory}>{isSavingCategory ? '저장 중...' : '저장'}</button>
              </div>
            </form>
          )}

          {!selectedBoard ? (
            <div className="admin-empty-state"><span aria-hidden="true">◇</span><strong>선택된 게시판이 없습니다.</strong><p>왼쪽 목록에서 카테고리를 관리할 게시판을 선택하세요.</p></div>
          ) : isLoadingCategories ? (
            <div className="boards-state" role="status">카테고리를 불러오는 중입니다...</div>
          ) : categories.length === 0 ? (
            <div className="admin-empty-state"><span aria-hidden="true">◇</span><strong>등록된 카테고리가 없습니다.</strong><p>이 게시판에 필요한 카테고리를 추가해 주세요.</p></div>
          ) : (
            <div className="admin-category-list">
              {categories.map((category) => (
                <article className="admin-category-item" key={category.id}>
                  <span className="admin-category-badge">#</span>
                  <strong>{category.name}</strong>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-text-action" onClick={() => beginEditCategory(category)}>수정</button>
                    <button type="button" className="admin-text-action admin-text-danger" onClick={() => handleCategoryDelete(category)} disabled={busyAction === `category:${category.id}`}>{busyAction === `category:${category.id}` ? '삭제 중...' : '삭제'}</button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="admin-panel-footer"><span className="admin-muted-note">이름은 최대 100자까지 입력할 수 있습니다.</span></div>
        </section>
      </div>
    </main>
  )
}
