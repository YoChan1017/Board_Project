import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <main className="home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> YOUR COMMUNITY SPACE</span>
          <h1>생각을 나누고,<br /><span>기록을 쌓아가세요.</span></h1>
          <p className="hero-description">
            관심 있는 주제로 이야기를 나누고, 유용한 정보를 함께 기록하는 공간입니다.
          </p>

          {user ? (
            <div className="hero-actions">
              <Link className="button button-primary" to="/dashboard">내 대시보드 <span aria-hidden="true">→</span></Link>
              <p className="welcome-note">반가워요, {user.nickname || user.username}님.</p>
            </div>
          ) : (
            <div className="hero-actions">
              <Link className="button button-primary" to="/signup">계정 만들기 <span aria-hidden="true">→</span></Link>
              <Link className="button button-secondary" to="/login">로그인</Link>
            </div>
          )}
          <div className="hero-meta">
            <span><span className="meta-check">✓</span> 간편한 회원가입</span>
            <span><span className="meta-check">✓</span> 안전한 토큰 인증</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="게시판 기능 소개">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-card card-back">
            <div className="mini-card-top"><span className="mini-icon violet">✦</span><span className="skeleton skeleton-short" /></div>
            <span className="skeleton skeleton-long" />
            <span className="skeleton skeleton-medium" />
            <div className="mini-lines"><span /><span /><span /></div>
          </div>
          <div className="visual-card card-front">
            <div className="post-label"><span className="mini-icon mint">✎</span><span>COMMUNITY</span><span className="post-status">NEW</span></div>
            <h2>오늘의 이야기</h2>
            <p>작은 생각도 함께 나누면<br />더 큰 아이디어가 됩니다.</p>
            <div className="post-divider" />
            <div className="post-bottom"><div className="avatar-stack"><i>J</i><i>M</i><i>K</i></div><span>함께 이야기하기 <b>↗</b></span></div>
          </div>
          <div className="floating-badge badge-top"><span>✦</span> 새로운 기록</div>
          <div className="floating-badge badge-bottom"><span>✓</span> 인증 완료</div>
        </div>
      </section>

      <section className="feature-section" aria-labelledby="feature-title">
        <div className="section-heading">
          <span className="eyebrow">BUILT FOR SHARING</span>
          <h2 id="feature-title">필요한 기능부터 차근차근</h2>
          <p>먼저 계정과 인증을 연결하고, 게시판 기능을 하나씩 확장합니다.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card"><span className="feature-icon icon-purple">01</span><h3>간편한 계정 관리</h3><p>회원가입과 로그인을 통해 나만의 계정으로 서비스를 이용합니다.</p></article>
          <article className="feature-card"><span className="feature-icon icon-green">02</span><h3>주제별 게시판</h3><p>관심사에 따라 게시글을 모아 보고 원하는 내용을 검색합니다.</p></article>
          <article className="feature-card"><span className="feature-icon icon-orange">03</span><h3>함께하는 대화</h3><p>댓글과 좋아요로 게시글에 반응하고 생각을 나눕니다.</p></article>
        </div>
      </section>
    </main>
  )
}
