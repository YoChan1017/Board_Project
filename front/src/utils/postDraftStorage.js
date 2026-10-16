const POST_DRAFT_STORAGE_PREFIX = 'board-project:post-draft:v1'

function encodePart(value) {
  return encodeURIComponent(String(value))
}

/** Creates a user-scoped sessionStorage key so drafts do not cross accounts or posts. */
export function createPostDraftKey(mode, resourceId, userIdentifier) {
  if (!mode || resourceId == null || userIdentifier == null || String(userIdentifier).trim() === '') return ''
  return `${POST_DRAFT_STORAGE_PREFIX}:${encodePart(userIdentifier)}:${encodePart(mode)}:${encodePart(resourceId)}`
}

export function readPostDraft(key) {
  if (!key || typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.title !== 'string' || typeof parsed.content !== 'string') return null

    return {
      title: parsed.title,
      content: parsed.content,
      categoryId: parsed.categoryId == null ? '' : String(parsed.categoryId),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    }
  } catch {
    // Storage may be disabled or full. A draft must never prevent form use.
    return null
  }
}

export function savePostDraft(key, draft) {
  if (!key || typeof window === 'undefined') return false

  try {
    window.sessionStorage.setItem(key, JSON.stringify({
      title: String(draft.title ?? ''),
      content: String(draft.content ?? ''),
      categoryId: draft.categoryId == null ? '' : String(draft.categoryId),
      savedAt: new Date().toISOString(),
    }))
    return true
  } catch {
    // Quota and privacy-mode errors are non-fatal; the live form remains usable.
    return false
  }
}

export function removePostDraft(key) {
  if (!key || typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Ignore storage failures; the successful server response is authoritative.
  }
}
