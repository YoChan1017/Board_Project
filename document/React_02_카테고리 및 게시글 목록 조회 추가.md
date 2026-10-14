# FrontEnd 2차 작업 정리 — 게시판 목록 조회

## 1. 작업 목표

1차 작업에서 구현한 회원가입·로그인·JWT 인증 흐름을 유지하면서, 로그인한 사용자가 실제 백엔드의 게시판 데이터를 조회할 수 있도록 화면과 API 호출을 추가한다.

## 2. 구현 범위

- 게시판 목록 조회: `GET /api/boards`
- 게시판 선택 시 카테고리 조회: `GET /api/boards/{boardId}/categories`
- 게시판별 게시글 목록 조회: `GET /api/boards/{boardId}/posts?page=0&size=10`
- 게시글 검색: `keyword` 쿼리 파라미터 전달
- 페이지네이션: Spring `Page` 응답의 `totalPages`, `totalElements` 사용
- 로딩 상태, API 오류 메시지, 게시판/게시글 빈 상태 처리
- 로그인한 사용자에게 상단 게시판 메뉴 표시
- `/boards` 경로를 인증 보호 경로로 등록
- 데스크톱 및 모바일 화면 대응 CSS 추가

## 3. 추가·수정 파일

| 경로 | 내용 |
|---|---|
| `front/src/api/boardApi.js` | 게시판·카테고리·게시글 목록 API 모듈 |
| `front/src/pages/BoardsPage.jsx` | 게시판 선택, 카테고리 태그, 검색, 게시글 목록, 페이지네이션 |
| `front/src/App.jsx` | 보호 경로 `/boards` 등록 |
| `front/src/components/AppLayout.jsx` | 로그인 상태일 때 게시판 내비게이션 표시 |
| `front/boards.css.txt` | 기존 `App.css` 아래에 추가할 스타일 |

## 4. 백엔드 응답과의 연결

### BoardResponse

- `id`
- `name`
- `description`

### CategoryResponse

- `id`
- `boardId`
- `name`

### PostListResponse

- `id`
- `categoryId`
- `categoryName`
- `authorNickname`
- `title`
- `viewCount`
- `likeCount`
- `createdAt`

게시글 목록 API의 응답은 Spring Data `Page` 구조이며 화면은 `content`, `totalPages`, `totalElements`를 사용한다.

## 5. 인증 처리

별도 토큰 구현을 중복하지 않고 기존 Axios 클라이언트(`src/api/client.js`)를 사용한다. 따라서 저장된 JWT는 기존 인터셉터를 통해 `Authorization: Bearer ...` 헤더로 전달된다. 게시판 화면은 기존 `ProtectedRoute` 안에 배치했다.

## 6. 수동 확인 체크리스트

- [ ] 로그인 후 게시판 메뉴가 표시된다.
- [ ] `/boards` 접근 시 게시판 목록이 표시된다.
- [ ] 게시판이 여러 개라면 선택에 따라 카테고리와 게시글이 변경된다.
- [ ] 검색어가 게시글 API의 `keyword` 파라미터로 전달된다.
- [ ] 검색 초기화 후 전체 목록이 다시 표시된다.
- [ ] 이전/다음 페이지가 정상 작동한다.
- [ ] 게시판 또는 게시글이 없을 때 빈 상태 메시지가 표시된다.
- [ ] 서버 오류 시 오류 메시지가 표시된다.
- [ ] 모바일 폭에서도 목록을 사용할 수 있다.

## 7. 아직 구현하지 않은 항목

- 게시글 상세 화면 및 상세 조회 API
- 게시글 작성·수정·삭제
- 카테고리별 게시글 필터링
- 관리자용 게시판/카테고리 생성·수정·삭제 UI
- 자동화된 프론트엔드 테스트

> 참고: 이 단계에서는 코드를 준비했으며, 사용자 환경에서 실제 API 연결과 동작을 확인한 뒤 완료로 기록한다.
