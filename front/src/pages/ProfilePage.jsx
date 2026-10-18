import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ErrorMessage, LoadingState, SuccessMessage } from '../components/FeedbackState'

function formatDate(value) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '정보 없음'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(date)
}

function roleLabel(role) {
  return ['ADMIN', 'ROLE_ADMIN'].includes(role) ? '관리자' : '일반 회원'
}

export default function ProfilePage() {
  const { updateCurrentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ nickname: '', email: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const data = await authApi.me()
      setProfile(data)
      setForm({ nickname: data.nickname ?? '', email: data.email ?? '' })
      updateCurrentUser(data)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '프로필을 불러오지 못했습니다.'))
    } finally {
      setIsLoading(false)
    }
  }, [updateCurrentUser])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const nickname = form.nickname.trim()
    const email = form.email.trim()
    if (nickname.length < 2 || nickname.length > 50) {
      setErrorMessage('닉네임은 공백을 제외하고 2~50자로 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await authApi.updateMe({
        nickname,
        email: email || null,
      })
      setProfile(updated)
      setForm({ nickname: updated.nickname ?? '', email: updated.email ?? '' })
      updateCurrentUser(updated)
      setSuccessMessage('프로필이 저장되었습니다.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '프로필 저장에 실패했습니다. 입력한 정보를 확인해 주세요.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="profile-page">
      <section className="profile-heading">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> ACCOUNT SETTINGS</span>
          <h1>내 프로필</h1>
          <p>계정 정보를 확인하고 다른 회원에게 표시될 닉네임과 이메일을 관리하세요.</p>
        </div>
        <Link className="button button-secondary" to="/activity">내 활동 보기 <span aria-hidden="true">→</span></Link>
      </section>

      {isLoading ? (
        <LoadingState className="profile-loading">프로필 정보를 불러오는 중입니다...</LoadingState>
      ) : errorMessage && !profile ? (
        <ErrorMessage className="profile-load-error" actionLabel="다시 불러오기" onAction={loadProfile}>
          {errorMessage}
        </ErrorMessage>
      ) : profile ? (
        <div className="profile-panel-grid">
          <section className="profile-summary-card" aria-labelledby="profile-summary-title">
            <div className="profile-avatar" aria-hidden="true">{(profile.nickname || profile.username || '?').slice(0, 1).toUpperCase()}</div>
            <span className="profile-role-pill">{roleLabel(profile.role)}</span>
            <h2 id="profile-summary-title">{profile.nickname || profile.username}</h2>
            <p className="profile-summary-username">@{profile.username}</p>
            <div className="profile-summary-divider" />
            <dl className="profile-summary-details">
              <div><dt>아이디</dt><dd>{profile.username}</dd></div>
              <div><dt>이메일</dt><dd>{profile.email || '등록되지 않음'}</dd></div>
              <div><dt>가입일</dt><dd>{formatDate(profile.createdAt)}</dd></div>
              <div><dt>최근 정보 변경</dt><dd>{formatDate(profile.updatedAt)}</dd></div>
            </dl>
            <p className="profile-summary-note">아이디와 권한은 계정 보안을 위해 이 화면에서 변경할 수 없습니다.</p>
          </section>

          <section className="profile-editor-card" aria-labelledby="profile-edit-title">
            <div className="profile-editor-heading">
              <span className="profile-editor-icon" aria-hidden="true">✎</span>
              <div><h2 id="profile-edit-title">프로필 정보 수정</h2><p>변경할 정보를 입력한 뒤 저장해 주세요.</p></div>
            </div>

            {errorMessage && <div className="error-message profile-form-message" role="alert">{errorMessage}</div>}
            {successMessage && <SuccessMessage className="profile-success-message">{successMessage}</SuccessMessage>}

            <form className="profile-form" onSubmit={handleSubmit}>
              <label htmlFor="profile-username">아이디 <span>변경 불가</span></label>
              <input id="profile-username" type="text" value={profile.username || ''} readOnly disabled />

              <label htmlFor="profile-nickname">닉네임 <span>2~50자</span></label>
              <input
                id="profile-nickname"
                name="nickname"
                type="text"
                autoComplete="nickname"
                minLength={2}
                maxLength={50}
                value={form.nickname}
                onChange={handleChange}
                placeholder="화면에 표시할 닉네임"
                required
              />

              <label htmlFor="profile-email">이메일 <span>선택 사항</span></label>
              <input
                id="profile-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={100}
                value={form.email}
                onChange={handleChange}
                placeholder="name@example.com"
              />
              <p className="profile-form-help">이메일 입력란을 비우고 저장하면 등록된 이메일을 삭제합니다.</p>

              <button className="button button-primary button-wide" type="submit" disabled={isSubmitting}>
                {isSubmitting ? '저장 중...' : '변경 사항 저장'} <span aria-hidden="true">→</span>
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
