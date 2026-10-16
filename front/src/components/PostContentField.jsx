import { useState } from 'react'

/** Reusable post-body input with a plain-text preview and live character count. */
export default function PostContentField({
  id,
  value,
  onChange,
  placeholder = '게시글 내용을 입력해 주세요',
  disabled = false,
  error = '',
}) {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)
  const previewId = `${id}-preview`
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = error ? `${helpId} ${errorId}` : helpId

  return (
    <div className={`post-content-field${error ? ' has-field-error' : ''}`}>
      <div className="post-content-toolbar">
        <span className="post-content-count" aria-live="polite">본문 {value.length.toLocaleString('ko-KR')}자</span>
        <button
          type="button"
          className="post-preview-toggle"
          onClick={() => setIsPreviewVisible((visible) => !visible)}
          aria-expanded={isPreviewVisible}
          aria-controls={previewId}
          disabled={disabled}
        >
          {isPreviewVisible ? '미리보기 숨기기' : '미리보기 보기'}
        </button>
      </div>
      <textarea
        id={id}
        rows={14}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      <p id={helpId} className="post-content-help">입력한 줄바꿈과 문단 간격은 미리보기에 그대로 표시됩니다.</p>
      {error && <p id={errorId} className="post-field-error" role="alert">{error}</p>}
      <section id={previewId} className="post-content-preview" aria-label="본문 미리보기" hidden={!isPreviewVisible}>
        <span className="post-content-preview-title">본문 미리보기</span>
        <p>{value.trim() ? value : '미리보기할 내용이 없습니다.'}</p>
      </section>
    </div>
  )
}
