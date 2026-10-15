import { useCallback, useEffect, useState } from 'react'
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
  const [attachments, setAttachments] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [busyAttachmentId, setBusyAttachmentId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadAttachments = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await boardApi.getAttachments(postId)
      setAttachments(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setError(getErrorMessage(requestError, '첨부파일 목록을 불러오지 못했습니다.'))
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  useEffect(() => {
    loadAttachments()
  }, [loadAttachments])

  function handleFileChange(event) {
    const files = Array.from(event.target.files ?? [])
    setSelectedFiles(files)
    setError('')
    setNotice('')
    // Let the same file be selected again after an unsuccessful attempt.
    event.target.value = ''
  }

  async function handleUpload(event) {
    event.preventDefault()
    if (selectedFiles.length === 0) {
      setError('먼저 업로드할 파일을 선택해 주세요.')
      return
    }

    setIsUploading(true)
    setError('')
    setNotice('')
    const errors = []
    let successfulCount = 0

    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: 파일 크기는 10MB 이하여야 합니다.`)
          continue
        }
        if (file.size === 0) {
          errors.push(`${file.name}: 빈 파일은 업로드할 수 없습니다.`)
          continue
        }

        try {
          const uploaded = await boardApi.uploadAttachment(postId, file)
          setAttachments((current) => [...current, uploaded])
          successfulCount += 1
        } catch (requestError) {
          errors.push(`${file.name}: ${getErrorMessage(requestError, '업로드에 실패했습니다.')}`)
        }
      }
      setSelectedFiles([])
      if (successfulCount > 0) {
        setNotice(`${successfulCount}개 파일을 업로드했습니다.`)
      }
      if (errors.length > 0) {
        setError(errors.join('\n'))
      }
    } finally {
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
    <section className="attachments-panel" aria-labelledby="attachments-heading">
      <div className="attachments-heading-row">
        <div>
          <span className="panel-kicker">FILES</span>
          <h2 id="attachments-heading">첨부파일 <span>{attachments.length}</span></h2>
        </div>
        <span className="attachments-limit">파일당 최대 10MB</span>
      </div>

      {error && <ErrorMessage className="boards-alert attachment-alert">{error}</ErrorMessage>}
      {notice && <SuccessMessage className="attachment-notice" as="p">{notice}</SuccessMessage>}

      {canManage && (
        <form className="attachment-upload-form" onSubmit={handleUpload}>
          <label className="attachment-file-label" htmlFor="post-attachments">
            <span aria-hidden="true">＋</span> 파일 선택
          </label>
          <input
            id="post-attachments"
            className="attachment-file-input"
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <span className="attachment-selected-files">
            {selectedFiles.length === 0
              ? '선택한 파일 없음'
              : selectedFiles.map((file) => file.name).join(', ')}
          </span>
          <button type="submit" className="button button-primary button-small" disabled={isUploading || selectedFiles.length === 0}>
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
        </form>
      )}

      {isLoading ? (
        <LoadingState className="attachment-state">첨부파일 목록을 불러오는 중입니다...</LoadingState>
      ) : attachments.length === 0 ? (
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
