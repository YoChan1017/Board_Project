import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { boardApi } from '../api/boardApi'
import { getErrorMessage } from '../api/client'
import { EmptyState, ErrorMessage, LoadingState, SuccessMessage } from './FeedbackState'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatBytes(value) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0) return '크기 알 수 없음'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename || 'attachment'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function AttachmentsSection({ postId, canManage }) {
  const uploadLock = useRef(false)
  const [attachments, setAttachments] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [busyAttachmentId, setBusyAttachmentId] = useState(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [selectionError, setSelectionError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedTotalSize = useMemo(
    () => selectedFiles.reduce((total, file) => total + file.size, 0),
    [selectedFiles],
  )

  const loadAttachments = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await boardApi.getAttachments(postId)
      setAttachments(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setLoadError(getErrorMessage(requestError, '첨부파일 목록을 불러오지 못했습니다.'))
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  useEffect(() => {
    loadAttachments()
  }, [loadAttachments])

  function addFiles(fileList) {
    const incomingFiles = Array.from(fileList ?? [])
    if (incomingFiles.length === 0 || isUploading) return

    const nextFiles = [...selectedFiles]
    const knownKeys = new Set(nextFiles.map(fileKey))
    const messages = []

    for (const file of incomingFiles) {
      if (file.size === 0) {
        messages.push(`${file.name}: 빈 파일은 첨부할 수 없습니다.`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        messages.push(`${file.name}: 파일 크기는 10MB 이하여야 합니다.`)
        continue
      }

      const key = fileKey(file)
      if (knownKeys.has(key)) {
        messages.push(`${file.name}: 이미 선택한 파일입니다.`)
        continue
      }

      nextFiles.push(file)
      knownKeys.add(key)
    }

    setSelectedFiles(nextFiles)
    setSelectionError(messages.join('\n'))
    setError('')
    setNotice('')
  }

  function handleFileChange(event) {
    addFiles(event.target.files)
    // Clear the input so the same file can be selected again after removal or failure.
    event.target.value = ''
  }

  function handleDragOver(event) {
    event.preventDefault()
    if (!isUploading) setIsDragOver(true)
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsDragOver(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragOver(false)
    if (!isUploading) addFiles(event.dataTransfer?.files)
  }

  function removeSelectedFile(targetKey) {
    if (isUploading) return
    setSelectedFiles((current) => current.filter((file) => fileKey(file) !== targetKey))
    setSelectionError('')
    setError('')
    setNotice('')
  }

  async function handleUpload(event) {
    event.preventDefault()
    if (uploadLock.current || isUploading) return
    if (selectedFiles.length === 0) {
      setError('먼저 업로드할 파일을 선택해 주세요.')
      return
    }

    uploadLock.current = true
    const filesToUpload = [...selectedFiles]
    setIsUploading(true)
    setError('')
    setSelectionError('')
    setNotice('')
    const errors = []
    const failedFiles = []
    let successfulCount = 0

    try {
      for (const file of filesToUpload) {
        // Keep validation here too so the upload path remains safe if selection logic changes.
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: 파일 크기는 10MB 이하여야 합니다.`)
          failedFiles.push(file)
          continue
        }
        if (file.size === 0) {
          errors.push(`${file.name}: 빈 파일은 업로드할 수 없습니다.`)
          failedFiles.push(file)
          continue
        }

        try {
          const uploaded = await boardApi.uploadAttachment(postId, file)
          setAttachments((current) => [...current, uploaded])
          successfulCount += 1
        } catch (requestError) {
          errors.push(`${file.name}: ${getErrorMessage(requestError, '업로드에 실패했습니다.')}`)
          failedFiles.push(file)
        }
      }

      // Successful files leave the queue; failed ones stay selected for an easy retry.
      setSelectedFiles(failedFiles)
      if (successfulCount > 0) {
        const remainingMessage = failedFiles.length > 0
          ? ` 실패한 ${failedFiles.length}개 파일은 선택 목록에 남겨 두었습니다.`
          : ''
        setNotice(`${successfulCount}개 파일을 업로드했습니다.${remainingMessage}`)
      }
      if (errors.length > 0) setError(errors.join('\n'))
    } finally {
      uploadLock.current = false
      setIsUploading(false)
    }
  }

  async function handleDownload(attachment) {
    setBusyAttachmentId(attachment.id)
    setError('')
    setNotice('')
    try {
      const blob = await boardApi.downloadAttachment(attachment.id)
      triggerDownload(blob, attachment.originalName)
    } catch (requestError) {
      setError(getErrorMessage(requestError, '첨부파일 다운로드에 실패했습니다.'))
    } finally {
      setBusyAttachmentId(null)
    }
  }

  async function handleDelete(attachment) {
    const confirmed = window.confirm(`'${attachment.originalName}' 파일을 삭제할까요?`)
    if (!confirmed) return

    setBusyAttachmentId(attachment.id)
    setError('')
    setNotice('')
    try {
      await boardApi.deleteAttachment(attachment.id)
      setAttachments((current) => current.filter((item) => String(item.id) !== String(attachment.id)))
      setNotice('첨부파일을 삭제했습니다.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, '첨부파일 삭제에 실패했습니다.'))
    } finally {
      setBusyAttachmentId(null)
    }
  }

  return (
    <section className="attachments-panel" aria-labelledby="attachments-heading" aria-busy={isLoading || isUploading || busyAttachmentId !== null}>
      <div className="attachments-heading-row">
        <div>
          <span className="panel-kicker">FILES</span>
          <h2 id="attachments-heading">첨부파일 <span>{attachments.length}</span></h2>
        </div>
        <span className="attachments-limit">파일당 최대 10MB</span>
      </div>

      {loadError && (
        <ErrorMessage className="boards-alert attachment-alert" actionLabel="다시 불러오기" onAction={loadAttachments}>
          {loadError}
        </ErrorMessage>
      )}
      {error && <ErrorMessage className="boards-alert attachment-alert">{error}</ErrorMessage>}
      {notice && <SuccessMessage className="attachment-notice" as="p">{notice}</SuccessMessage>}
      {selectionError && <ErrorMessage className="boards-alert attachment-alert">{selectionError}</ErrorMessage>}

      {canManage && (
        <form className="attachment-upload-form" onSubmit={handleUpload} aria-busy={isUploading}>
          <div
            className={`attachment-dropzone${isDragOver ? ' is-drag-over' : ''}${isUploading ? ' is-disabled' : ''}`}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-label="첨부할 파일을 끌어 놓거나 파일 선택 버튼을 사용하세요"
          >
            <span className="attachment-dropzone-icon" aria-hidden="true">↥</span>
            <div className="attachment-dropzone-copy">
              <strong>파일을 여기에 끌어 놓으세요</strong>
              <span>또는 파일 선택 버튼을 사용하세요 · 파일당 최대 10MB</span>
            </div>
            <input
              id="post-attachments"
              className="attachment-file-input"
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={isUploading}
              aria-label="첨부파일 선택"
            />
            <label className="attachment-file-label" htmlFor="post-attachments">
              <span aria-hidden="true">＋</span> 파일 선택
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="attachment-queue">
              <div className="attachment-queue-heading">
                <strong>업로드 대기 파일 <span>{selectedFiles.length}</span></strong>
                <span>합계 {formatBytes(selectedTotalSize)}</span>
              </div>
              <ul className="attachment-selected-list" aria-label="업로드 대기 파일 목록">
                {selectedFiles.map((file) => (
                  <li key={fileKey(file)} className="attachment-selected-item">
                    <span className="attachment-selected-icon" aria-hidden="true">▤</span>
                    <span className="attachment-selected-name" title={file.name}>{file.name}</span>
                    <span className="attachment-selected-size">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      className="attachment-remove-selected"
                      onClick={() => removeSelectedFile(fileKey(file))}
                      disabled={isUploading}
                      aria-label={`${file.name} 선택 취소`}
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="attachment-upload-actions">
            <span className="attachment-upload-help">
              {selectedFiles.length === 0 ? '선택한 파일 없음' : '실패한 파일은 다시 업로드할 수 있도록 목록에 남습니다.'}
            </span>
            <button type="submit" className="button button-primary button-small" disabled={isUploading || selectedFiles.length === 0}>
              {isUploading ? '업로드 중...' : `업로드${selectedFiles.length ? ` (${selectedFiles.length})` : ''}`}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <LoadingState className="attachment-state">첨부파일 목록을 불러오는 중입니다...</LoadingState>
      ) : loadError ? null : attachments.length === 0 ? (
        <EmptyState className="attachment-empty" title="등록된 첨부파일이 없습니다." />
      ) : (
        <ul className="attachment-list">
          {attachments.map((attachment) => (
            <li className="attachment-item" key={attachment.id}>
              <span className="attachment-file-icon" aria-hidden="true">↧</span>
              <div className="attachment-file-info">
                <strong title={attachment.originalName}>{attachment.originalName}</strong>
                <span>{formatBytes(attachment.fileSize)} · {formatDate(attachment.createdAt)}</span>
              </div>
              <div className="attachment-actions">
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => handleDownload(attachment)}
                  disabled={busyAttachmentId !== null}
                >
                  {String(busyAttachmentId) === String(attachment.id) ? '처리 중...' : '다운로드'}
                </button>
                {canManage && (
                  <button
                    type="button"
                    className="button button-danger button-small"
                    onClick={() => handleDelete(attachment)}
                    disabled={busyAttachmentId !== null || isUploading}
                  >
                    삭제
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
