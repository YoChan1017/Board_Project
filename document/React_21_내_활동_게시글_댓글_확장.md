# React 21차 — 내 활동을 게시글·댓글까지 확장

## 목적

`내 활동` 화면에 기존 브라우저 로컬의 최근 본 게시글 외에, 로그인한 사용자가 실제로 작성한 게시글과 댓글을 추가한다. 본인 계정으로 조회하도록 백엔드 API에서 인증 주체의 username을 사용하며, 페이지네이션과 검색을 서버에서 수행한다.

## 변경 파일

### 백엔드
- `back/src/main/java/com/example/board/controller/MyActivityController.java` (신규)
  - `GET /api/me/posts?page=0&size=10&keyword=`
  - `GET /api/me/comments?page=0&size=10&keyword=`
  - 두 API 모두 JWT 인증의 `Authentication.getName()`을 기준으로 현재 사용자 활동만 조회한다.
- `back/src/main/java/com/example/board/service/MyActivityService.java` (신규)
  - 페이지·페이지 크기·검색어 검증, 최신순 정렬, DTO 변환을 담당한다.
- `back/src/main/java/com/example/board/repository/PostRepository.java`
  - 본인이 작성한 삭제되지 않은 게시글을 검색·페이지네이션하는 JPQL 쿼리를 추가한다.
- `back/src/main/java/com/example/board/repository/CommentRepository.java`
  - 본인이 작성한 삭제되지 않은 댓글 중 삭제되지 않은 게시글에 달린 댓글만 조회하는 JPQL 쿼리를 추가한다.
- `back/src/main/java/com/example/board/dto/activity/MyPostResponse.java` (신규)
- `back/src/main/java/com/example/board/dto/activity/MyCommentResponse.java` (신규)
  - 화면에 필요한 요약 데이터만 반환하며 게시글 전체 본문은 게시글 목록 응답에 포함하지 않는다.

### 프론트엔드
- `front/src/api/boardApi.js`
  - `getMyPosts()`와 `getMyComments()` 호출 메서드를 추가한다.
- `front/src/pages/MyActivityPage.jsx`
  - `최근 본 글`, `내 게시글`, `내 댓글` 탭을 추가한다.
  - 작성 게시글/댓글은 서버 페이지네이션(10/20/50개)과 검색을 사용한다.
  - 빈 상태, 오류 재시도, 작성 날짜, 게시판·카테고리 정보 및 관련 게시글 링크를 표시한다.
- `front/src/App.css`

## API 동작

### `GET /api/me/posts`
- Query: `page` (기본 0), `size` (기본 10, 1~100), `keyword` (선택, 최대 200자)
- 검색: 본인 게시글의 제목 또는 본문에 대한 부분 검색
- 응답: Spring `Page<MyPostResponse>`
- 삭제 처리된 게시글은 제외한다.

### `GET /api/me/comments`
- Query: `page`, `size`, `keyword`는 게시글 API와 동일
- 검색: 본인 댓글 내용 또는 댓글이 달린 게시글 제목에 대한 부분 검색
- 응답: Spring `Page<MyCommentResponse>`
- 삭제 처리된 댓글과 삭제 처리된 게시글의 댓글은 제외한다.

현재 `SecurityConfig`는 `/api/auth/signup`, `/api/auth/login` 외 모든 API를 인증 필수로 설정하므로 추가 허용 규칙은 필요하지 않다. 컨트롤러는 클라이언트가 제출한 임의의 사용자 ID를 받지 않고 인증된 principal 이름을 사용한다.

## DB 변경

새 테이블이나 Flyway migration은 필요하지 않다. 기존 `posts`, `comments`, `users`, `boards`, `categories` 연관 관계를 사용한다.

## 수동 검증 체크리스트

- [ ] 계정 A 로그인 시 A가 작성한 게시글만 `/api/me/posts`에 나온다.
- [ ] 계정 A 로그인 시 A가 작성한 댓글만 `/api/me/comments`에 나온다.
- [ ] 삭제 처리된 게시글/댓글이 내 활동 목록에서 제외된다.
- [ ] 제목/본문/댓글 검색, 페이지 이동, 페이지 크기 변경이 작동한다.
- [ ] 로그인하지 않은 상태로 API를 호출하면 인증 오류가 발생한다.
- [ ] 최근 본 기록 탭이 기존 로컬 기록/삭제 동작을 유지한다.
- [ ] 내 게시글/댓글 탭의 오류 재시도와 빈 상태 안내가 정상 작동한다.

## 검증 범위 및 제한

이번 패치는 백엔드와 프론트엔드 파일을 함께 변경한다. ZIP에는 DB migration이 없으며 외부 API 계약 변경 외에 스키마 변경은 없다. 빌드 도구/의존성을 이용한 실제 Maven 통합 빌드나 브라우저 백엔드 연동은 별도 실행 환경에서 확인해야 한다. 권한 검사는 화면이 아니라 백엔드 쿼리에서 현재 인증된 username을 조건으로 적용한다.
