import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { getErrorMessage } from '../api/client'

const initialForm = { username: '', nickname: '', email: '', password: '', passwordConfirm: '' }

export default function SignupPage() {
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

    if (form.password !== form.passwordConfirm) {
      setErrorMessage('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)
    try {
      await authApi.signup({
        username: form.username.trim(),
        nickname: form.nickname.trim(),
        email: form.email.trim() || null,
        password: form.password,
      })
      navigate('/login', {
        replace: true,
        state: { notice: '회원가입이 완료되었습니다. 로그인해 주세요.' },
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '회원가입에 실패했습니다. 입력한 정보를 확인해 주세요.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page signup-page">
      <section className="auth-card">
        <div className="auth-heading">
          <span className="auth-symbol">＋</span>
          <span className="eyebrow">JOIN THE COMMUNITY</span>
          <h1>새로운 계정 만들기</h1>
          <p>필수 정보를 입력하고 시작해 보세요.</p>
        </div>

        {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="username">아이디 <span className="input-hint">4~50자</span></label>
          <input id="username" name="username" type="text" autoComplete="username" minLength={4} maxLength={50} value={form.username} onChange={handleChange} placeholder="사용할 아이디" required />

          <label htmlFor="nickname">닉네임 <span className="input-hint">2~50자</span></label>
          <input id="nickname" name="nickname" type="text" autoComplete="nickname" minLength={2} maxLength={50} value={form.nickname} onChange={handleChange} placeholder="화면에 표시할 이름" required />

          <label htmlFor="email">이메일 <span className="input-hint">선택</span></label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={100} value={form.email} onChange={handleChange} placeholder="name@example.com" />

          <label htmlFor="password">비밀번호 <span className="input-hint">8~100자</span></label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={100} value={form.password} onChange={handleChange} placeholder="8자 이상 입력하세요" required />

          <label htmlFor="passwordConfirm">비밀번호 확인</label>
          <input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} maxLength={100} value={form.passwordConfirm} onChange={handleChange} placeholder="비밀번호를 한 번 더 입력하세요" required />

          <button className="button button-primary button-wide" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '가입 처리 중...' : '회원가입'} <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="auth-switch">이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
        <p className="auth-security"><span aria-hidden="true">▣</span> 비밀번호는 백엔드에서 암호화해 저장합니다.</p>
      </section>
    </main>
  )
}
