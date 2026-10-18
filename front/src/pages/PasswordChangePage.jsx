import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export default function PasswordChangePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (form.newPassword.length < 8 || form.newPassword.length > 100) {
      setErrorMessage('새 비밀번호는 8~100자로 입력해 주세요.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setErrorMessage('새 비밀번호 확인이 일치하지 않습니다.')
      return
    }
    if (form.currentPassword === form.newPassword) {
      setErrorMessage('새 비밀번호는 현재 비밀번호와 달라야 합니다.')
      return
    }

    setIsSubmitting(true)
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })

      // The backend increments tokenVersion, so existing JWTs stop authenticating.
      // Clear this browser's token as well and require a fresh login.
      logout()
      navigate('/login', {
        replace: true,
        state: { notice: '비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.' },
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '비밀번호 변경에 실패했습니다. 입력한 정보를 확인해 주세요.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="security-page">
      <section className="security-heading">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> ACCOUNT SECURITY</span>
          <h1>보안 설정</h1>
          <p>계정 비밀번호를 변경하거나 계정 이용을 종료할 수 있습니다.</p>
        </div>
        <Link className="button button-secondary" to="/profile">내 프로필 <span aria-hidden="true">→</span></Link>
      </section>

      <section className="security-card" aria-labelledby="security-form-heading">
        <div className="security-card-heading">
          <span className="security-card-icon" aria-hidden="true">⌑</span>
          <div>
            <h2 id="security-form-heading">로그인 비밀번호</h2>
            <p>변경 후에는 새 비밀번호로 다시 로그인해야 합니다.</p>
          </div>
        </div>

        {errorMessage && <div className="error-message security-error" role="alert">{errorMessage}</div>}

        <form className="security-form" onSubmit={handleSubmit}>
          <label htmlFor="currentPassword">현재 비밀번호</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={handleChange}
            placeholder="현재 비밀번호 입력"
            maxLength={100}
            required
          />

          <label htmlFor="newPassword">새 비밀번호 <span>8~100자</span></label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={handleChange}
            placeholder="새 비밀번호 입력"
            minLength={8}
            maxLength={100}
            required
          />

          <label htmlFor="confirmPassword">새 비밀번호 확인</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="새 비밀번호를 한 번 더 입력"
            minLength={8}
            maxLength={100}
            required
          />

          <p className="security-form-help">현재 비밀번호가 맞지 않으면 변경되지 않습니다. 비밀번호 변경 시 기존 로그인 토큰도 서버에서 무효화됩니다.</p>
          <button className="button button-primary button-wide" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '변경 중...' : '비밀번호 변경'} <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>

      <section className="withdrawal-entry" aria-labelledby="withdrawal-entry-heading">
        <div>
          <span className="withdrawal-entry-kicker">ACCOUNT CLOSURE</span>
          <h2 id="withdrawal-entry-heading">회원 탈퇴</h2>
          <p>계정을 더 이상 사용하지 않으려는 경우, 본인 확인 후 개인정보를 정리하고 계정을 비활성화할 수 있습니다.</p>
        </div>
        <Link to="/account/withdraw" className="button withdrawal-entry-button">회원 탈퇴</Link>
      </section>
    </main>
  )
}
