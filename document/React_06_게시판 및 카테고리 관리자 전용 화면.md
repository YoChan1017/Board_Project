# Board Project 프론트엔드 6차 작업 — 게시판·카테고리 관리자 화면

## 목표

기존 Spring Boot API를 이용해 관리자만 게시판 및 카테고리를 생성·조회·수정·삭제할 수 있는 화면을 추가합니다. 백엔드 코드는 변경하지 않습니다.

## 작업 내용

- `front/src/api/boardApi.js` — 기존 API 메서드를 유지하면서 게시판·카테고리 CRUD 메서드를 추가한 전체 파일
- `front/src/components/AdminRoute.jsx` — 관리자 전용 화면 가드
- `front/src/components/AppLayout.jsx` — ADMIN에게만 `게시판 관리` 메뉴 표시
- `front/src/pages/AdminBoardManagementPage.jsx` — 관리 화면 신규 파일
- `front/src/App.jsx` — `/admin/boards` 라우트 추가
- `front/admin-board-management.css.txt` — 기존 CSS 맨 아래에 붙여 넣을 스타일

## 기능

### 게시판 관리
- 게시판 목록 및 선택
- 게시판 생성: 이름(최대 100자), 설명(최대 255자)
- 게시판 수정
- 삭제 전 확인 및 삭제 요청

### 카테고리 관리
- 선택한 게시판의 카테고리 목록 조회
- 카테고리 생성·이름 수정(최대 100자)·삭제
- 게시판을 바꾸면 해당 게시판의 카테고리 목록을 다시 조회

## 연동 API

- `GET /api/boards`
- `POST /api/boards`
- `PUT /api/boards/{boardId}`
- `DELETE /api/boards/{boardId}`
- `GET /api/boards/{boardId}/categories`
- `POST /api/boards/{boardId}/categories`
- `PUT /api/categories/{categoryId}`
- `DELETE /api/categories/{categoryId}`

기존 axios 클라이언트의 JWT 인터셉터가 인증 토큰을 전달합니다. 프론트엔드의 `AdminRoute`와 메뉴 노출은 편의상 적용하는 UI 권한 검사이며, 실제 보안은 기존 `SecurityConfig`의 `hasRole("ADMIN")` 규칙이 담당합니다.

## 확인 사항

- [ ] ADMIN 계정으로 게시판 관리 메뉴가 보인다.
- [ ] 일반 USER는 메뉴가 보이지 않고 `/admin/boards` 접근 시 대시보드로 이동한다.
- [ ] 게시판을 추가하면 목록에 표시된다.
- [ ] 게시판 이름·설명을 수정하면 목록에 반영된다.
- [ ] 선택한 게시판의 카테고리를 추가·수정·삭제할 수 있다.
- [ ] 삭제가 서버 규칙에 의해 거부되면 오류 메시지가 화면에 표시된다.
- [ ] 일반 게시판 화면과 게시글 상세·작성·수정, 댓글, 첨부파일 기능이 계속 동작한다.

## 참고

삭제 동작은 기존 백엔드의 데이터 무결성 정책에 따라 실패할 수 있으며, 그 경우 서버에서 반환한 오류 메시지를 표시합니다.
