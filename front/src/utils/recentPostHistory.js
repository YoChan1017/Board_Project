const STORAGE_PREFIX = 'board_project_recent_posts_v1'
export const MAX_RECENT_POSTS = 30

export function getRecentPostHistoryKey(user) {
  const accountKey = user?.userId ?? user?.username
  if (accountKey == null || String(accountKey).trim() === '') return null
  return `${STORAGE_PREFIX}_${encodeURIComponent(String(accountKey))}`
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object' || entry.postId == null || !String(entry.postId).trim()) {
    return null
  }

  return {
    postId: String(entry.postId),
    title: typeof entry.title === 'string' && entry.title.trim() ? entry.title : '제목 없는 게시글',
    authorNickname: typeof entry.authorNickname === 'string' ? entry.authorNickname : '',
    boardId: entry.boardId == null ? '' : String(entry.boardId),
    categoryName: typeof entry.categoryName === 'string' ? entry.categoryName : '',
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
    viewedAt: typeof entry.viewedAt === 'string' ? entry.viewedAt : '',
  }
}

export function readRecentPostHistory(user) {
  const key = getRecentPostHistoryKey(user)
  if (!key || typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]')
    if (!Array.isArray(parsed)) return []

    const seen = new Set()
    return parsed
      .map(normalizeEntry)
      .filter((entry) => {
        if (!entry || seen.has(entry.postId)) return false
        seen.add(entry.postId)
        return true
      })
      .slice(0, MAX_RECENT_POSTS)
  } catch {
    return []
  }
}

export function recordRecentPost(post, user) {
  const key = getRecentPostHistoryKey(user)
  if (!key || post?.id == null || typeof window === 'undefined') return

  const entry = normalizeEntry({
    postId: post.id,
    title: post.title,
    authorNickname: post.authorNickname,
    boardId: post.boardId,
    categoryName: post.categoryName,
    createdAt: post.createdAt,
    viewedAt: new Date().toISOString(),
  })
  if (!entry) return

  try {
    const nextHistory = [entry, ...readRecentPostHistory(user).filter((item) => item.postId !== entry.postId)]
      .slice(0, MAX_RECENT_POSTS)
    window.localStorage.setItem(key, JSON.stringify(nextHistory))
  } catch {
    // History is a convenience feature; a full or unavailable storage must not block a post page.
  }
}

export function removeRecentPostHistoryEntry(user, postId) {
  const key = getRecentPostHistoryKey(user)
  if (!key || typeof window === 'undefined') return readRecentPostHistory(user)

  const nextHistory = readRecentPostHistory(user).filter((entry) => entry.postId !== String(postId))
  try {
    window.localStorage.setItem(key, JSON.stringify(nextHistory))
  } catch {
    // Return the in-memory result even if storage is unavailable.
  }
  return nextHistory
}

export function clearRecentPostHistory(user) {
  const key = getRecentPostHistoryKey(user)
  if (key && typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // The caller still clears its rendered state.
    }
  }
}
