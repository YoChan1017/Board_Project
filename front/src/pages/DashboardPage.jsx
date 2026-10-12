import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <main className="dashboard-page">
      <section className="dashboard-welcome">
        <span className="eyebrow"><span className="eyebrow-dot" /> PRIVATE WORKSPACE</span>
        <h1>{user?.nickname || user?.username}님, 환영합니다.</h1>
        <p>로그인과 JWT 인증이 정상적으로 연결되었습니다. 다음 단계에서 게시판 목록과 게시글 기능을 이 화면에 연결합니다.</p>
      </section>

      <section className="account-panel" aria-labelledby="account-title">
        <div className="account-panel-heading">
          <div><span className="panel-kicker">ACCOUNT</span><h2 id="account-title">내 계정</h2></div>
          <span className="status-pill"><span /> 인증됨</span>
        </div>
        <dl className="account-details">
          <div><dt>아이디</dt><dd>{user?.username || '-'}</dd></div>
          <div><dt>닉네임</dt><dd>{user?.nickname || '-'}</dd></div>
          <div><dt>권한</dt><dd>{user?.role || 'USER'}</dd></div>
          <div><dt>사용자 ID</dt><dd>{user?.userId ?? '-'}</dd></div>
        </dl>
      </section>

      <section className="next-step-panel">
        <div className="next-step-icon">✦</div>
        <div><h2>다음 단계: 게시판 연결</h2><p>백엔드의 게시판 조회 API를 연결해 목록 화면을 만듭니다.</p></div>
        <Link to="/" className="text-link">홈으로 돌아가기 <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  )
}
