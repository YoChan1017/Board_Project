import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export default function AccountWithdrawalPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!password) {
      setErrorMessage('현재 비밀번호를 입력해 주세요.')
      return
    }
    if (confirmationText.trim() !== '탈퇴합니다') {
      setErrorMessage("확인란에 '탈퇴합니다'를 정확히 입력해 주세요.")
      return
    }

    setIsSubmitting(true)
    try {
      await authApi.withdrawAccount({
        password,
        confirmationText: confirmationText.trim(),
      })
      logout()
      navigate('/login', {
        replace: true,
        state: { notice: '회원 탈퇴가 처리되었습니다. 이용해 주셔서 감사합니다.' },
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '회원 탈퇴 처리에 실패했습니다. 입력한 정보를 확인해 주세요.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="security-page withdrawal-page">
      <section className="security-heading">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> ACCOUNT CLOSURE</span>
          <h1>회원 탈퇴</h1>
          <p>탈퇴 전 아래 처리 내용을 확인해 주세요. 이 작업은 되돌릴 수 없습니다.</p>
        </div>
        <Link className="button button-secondary" to="/security">보안 설정으로 돌아가기</Link>
      </section>

      <section className="withdrawal-card" aria-labelledby="withdrawal-heading">
        <div className="withdrawal-alert-icon" aria-hidden="true">!</div>
        <h2 id="withdrawal-heading">탈퇴하면 다음과 같이 처리됩니다.</h2>
        <ul className="withdrawal-consequences">
          <li>로그인 세션과 기존 인증 토큰이 무효화됩니다.</li>
          <li>닉네임과 이메일은 삭제 처리되며, 작성한 게시글·댓글 기록은 관계 보존을 위해 남습니다. 작성자 표시는 탈퇴 회원으로 변경됩니다.</li>
          <li>기존 아이디는 계정 이력과 인증 안전성을 위해 내부적으로 비활성 식별자로 변경되어 재사용할 수 있습니다.</li>
          <li>새 계정으로 가입할 때는 다른 아이디로 가입할 수 있습니다.</li>
        </ul>

        {errorMessage && <div className="error-message withdrawal-error" role="alert">{errorMessage}</div>}

        <form className="security-form withdrawal-form" onSubmit={handleSubmit}>
          <label htmlFor="withdrawal-password">현재 비밀번호</label>
          <input
            id="withdrawal-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setErrorMessage('') }}
            placeholder="계정 확인을 위해 비밀번호를 입력하세요"
            maxLength={100}
            required
          />

          <label htmlFor="withdrawal-confirmation">확인 문구 <span>탈퇴합니다</span></label>
          <input
            id="withdrawal-confirmation"
            type="text"
            autoComplete="off"
            value={confirmationText}
            onChange={(event) => { setConfirmationText(event.target.value); setErrorMessage('') }}
            placeholder="탈퇴합니다"
            maxLength={20}
            required
          />

          <button className="button withdrawal-submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '탈퇴 처리 중...' : '회원 탈퇴 진행'}
          </button>
          <Link className="withdrawal-cancel-link" to="/security">취소하고 돌아가기</Link>
        </form>
      </section>
    </main>
  )
}
