import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const notice = location.state?.notice

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await login(form)
      const destination = location.state?.from?.pathname || '/dashboard'
      navigate(destination, { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '로그인에 실패했습니다. 입력한 정보를 확인해 주세요.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading">
          <span className="auth-symbol">↗</span>
          <span className="eyebrow">WELCOME BACK</span>
          <h1>다시 만나 반가워요.</h1>
          <p>계정에 로그인해 이야기를 이어가세요.</p>
        </div>

        {notice && <div className="notice-message" role="status">{notice}</div>}
        {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="username">아이디</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            minLength={4}
            maxLength={50}
            value={form.username}
            onChange={handleChange}
            placeholder="아이디를 입력하세요"
            required
          />

          <div className="label-row"><label htmlFor="password">비밀번호</label></div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            placeholder="비밀번호를 입력하세요"
            required
          />

          <button className="button button-primary button-wide" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'} <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="auth-switch">아직 계정이 없으신가요? <Link to="/signup">회원가입</Link></p>
        <p className="auth-security"><span aria-hidden="true">▣</span> 로그인 정보는 백엔드 서버에서 확인됩니다.</p>
      </section>
    </main>
  )
}
