# Board_Project API 요약 명세

## 1. API 목록

| 기능 | 메서드 | 엔드포인트 | 인증/권한 | 성공 코드 | 요약 |
|---|---|---|---|---:|---|
| 회원가입 | POST | `/api/auth/signup` | 불필요 | 201 | 회원 생성, 응답: `userId` |
| 로그인 | POST | `/api/auth/login` | 불필요 | 200 | JWT 발급 및 사용자 정보 반환 |
| 내 정보(임시) | GET | `/api/auth/me` | 로그인 필요 | 200 | `username` 반환 |
| 게시판 목록 | GET | `/api/boards` | 로그인 필요 | 200 | 게시판 목록 조회 |
| 게시판 상세 | GET | `/api/boards/{boardId}` | 로그인 필요 | 200 | 게시판 1건 조회 |
| 게시판 생성 | POST | `/api/boards` | ADMIN | 201 | 게시판 생성 |
| 게시판 수정 | PUT | `/api/boards/{boardId}` | ADMIN | 200 | 게시판 정보 수정 |
| 게시판 삭제 | DELETE | `/api/boards/{boardId}` | ADMIN | 204 | 카테고리 또는 게시글이 있으면 삭제 거부 |
| 카테고리 목록 | GET | `/api/boards/{boardId}/categories` | 로그인 필요 | 200 | 게시판별 카테고리 조회 |
| 카테고리 생성 | POST | `/api/boards/{boardId}/categories` | ADMIN | 201 | 카테고리 생성 |
| 카테고리 상세 | GET | `/api/categories/{categoryId}` | 로그인 필요 | 200 | 카테고리 1건 조회 |
| 카테고리 수정 | PUT | `/api/categories/{categoryId}` | ADMIN | 200 | 카테고리 이름 수정 |
| 카테고리 삭제 | DELETE | `/api/categories/{categoryId}` | ADMIN | 204 | 카테고리 삭제 |
| 게시글 목록/검색 | GET | `/api/boards/{boardId}/posts` | 로그인 필요 | 200 | 페이지 조회 및 제목·본문 검색 |
| 게시글 생성 | POST | `/api/boards/{boardId}/posts` | 로그인 필요 | 201 | 게시글 작성 |
| 게시글 상세 | GET | `/api/posts/{postId}` | 로그인 필요 | 200 | 상세 조회 시 조회수 +1 |
| 게시글 수정 | PUT | `/api/posts/{postId}` | 작성자 또는 ADMIN | 200 | 제목·내용·카테고리 수정 |
| 게시글 삭제 | DELETE | `/api/posts/{postId}` | 작성자 또는 ADMIN | 204 | Soft Delete 처리 |
| 댓글 목록 | GET | `/api/posts/{postId}/comments` | 로그인 필요 | 200 | 삭제되지 않은 댓글을 작성일 오름차순으로 조회 |
| 댓글 상세 | GET | `/api/comments/{commentId}` | 로그인 필요 | 200 | 댓글 1건 조회 |
| 댓글/대댓글 작성 | POST | `/api/posts/{postId}/comments` | 로그인 필요 | 201 | `parentId`로 대댓글 지정 가능 |
| 댓글 수정 | PUT | `/api/comments/{commentId}` | 작성자 또는 ADMIN | 200 | 댓글 내용 수정 |
| 댓글 삭제 | DELETE | `/api/comments/{commentId}` | 작성자 또는 ADMIN | 204 | Soft Delete 처리 |
| 좋아요 상태 조회 | GET | `/api/posts/{postId}/likes` | 로그인 필요 | 200 | 좋아요 수와 `likedByMe` 반환 |
| 좋아요 등록 | POST | `/api/posts/{postId}/likes` | 로그인 필요 | 201 | 이미 좋아요한 글이면 오류 |
| 좋아요 취소 | DELETE | `/api/posts/{postId}/likes` | 로그인 필요 | 200 | 좋아요 내역이 없으면 오류 |
| 첨부파일 목록 | GET | `/api/posts/{postId}/attachments` | 로그인 필요 | 200 | 생성일 오름차순으로 조회 |
| 첨부파일 업로드 | POST | `/api/posts/{postId}/attachments` | 작성자 또는 ADMIN | 201 | `multipart/form-data`, 필드명 `file`, 최대 10 MiB |
| 첨부파일 다운로드 | GET | `/api/attachments/{attachmentId}/download` | 로그인 필요 | 200 | 파일 바이너리 다운로드 |
| 첨부파일 삭제 | DELETE | `/api/attachments/{attachmentId}` | 작성자 또는 ADMIN | 204 | 파일과 DB 레코드 삭제 |

## 2. 주요 요청 필드

| 기능 | 필드 | 필수 여부 | 검증/설명 |
|---|---|---|---|
| 회원가입 | `username` | 필수 | 4~50자, 공백 불가 |
| 회원가입 | `password` | 필수 | 8~100자, 공백 불가 |
| 회원가입 | `nickname` | 필수 | 2~50자, 공백 불가 |
| 회원가입 | `email` | 선택 | 지정하면 이메일 형식, 최대 100자 |
| 로그인 | `username`, `password` | 필수 | 공백 불가 |
| 게시판 생성/수정 | `name` | 필수 | 최대 100자, 공백 불가 |
| 게시판 생성/수정 | `description` | 선택 | 최대 255자 |
| 카테고리 생성/수정 | `name` | 필수 | 최대 100자, 공백 불가 |
| 게시글 생성/수정 | `title` | 필수 | 최대 200자, 공백 불가 |
| 게시글 생성/수정 | `content` | 필수 | 공백 불가, DTO에 최대 길이 제한 없음 |
| 게시글 생성/수정 | `categoryId` | 선택 | 지정 시 해당 게시판 소속 카테고리여야 함 |
| 댓글 작성 | `content` | 필수 | 최대 1000자, 공백 불가 |
| 댓글 작성 | `parentId` | 선택 | 부모 댓글 ID; 대댓글 작성 시 사용 |
| 댓글 수정 | `content` | 필수 | 최대 1000자, 공백 불가 |
| 파일 업로드 | `file` | 필수 | 비어 있지 않은 파일, 최대 10 MiB |
| 게시글 목록 | `page` | 선택 | 기본값 `0`, 0 이상 |
| 게시글 목록 | `size` | 선택 | 기본값 `10`, 1~100 |
| 게시글 목록 | `keyword` | 선택 | 제목·본문 검색; 앞뒤 공백 제거, 대소문자 구분 없이 검색 |

## 3. 주요 응답 필드

| 기능 | 응답 필드 |
|---|---|
| 회원가입 | `userId` |
| 로그인 | `accessToken`, `userId`, `username`, `nickname`, `role` |
| 내 정보(임시) | `username` |
| 게시판 | `id`, `name`, `description` |
| 카테고리 | `id`, `boardId`, `name` |
| 게시글 목록 항목 | `id`, `categoryId`, `categoryName`, `authorNickname`, `title`, `viewCount`, `likeCount`, `createdAt` |
| 게시글 상세 | `id`, `boardId`, `categoryId`, `categoryName`, `authorId`, `authorNickname`, `title`, `content`, `viewCount`, `likeCount`, `createdAt`, `updatedAt` |
| 댓글 목록 항목 | `id`, `parentId`, `authorId`, `authorNickname`, `content`, `createdAt`, `updatedAt` |
| 댓글 상세/작성/수정 | `id`, `postId`, `parentId`, `authorId`, `authorNickname`, `content`, `createdAt`, `updatedAt` |
| 좋아요 | `postId`, `likeCount`, `likedByMe` |
| 첨부파일 | `id`, `postId`, `originalName`, `fileSize`, `contentType`, `createdAt`, `downloadUrl` |
| 페이지네이션 | Spring Data `Page` 구조: `content`, 페이지 정보, 전체 건수 등 |

## 4. 공통 오류 응답

오류 JSON 기본 형식: `{ "code": "ERROR_CODE", "message": "설명" }`

| HTTP 코드 | 오류 코드 예시 | 발생 조건 |
|---:|---|---|
| 400 | `VALIDATION_FAILED`, `INVALID_REQUEST_BODY`, `INVALID_PARAMETER`, `BAD_REQUEST` | 입력값 검증 실패, JSON/파라미터 형식 오류, 잘못된 페이지 크기 등 |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` | 인증 누락/실패 또는 로그인 정보 오류 |
| 403 | `FORBIDDEN` | 권한 부족 |
| 404 | `RESOURCE_NOT_FOUND` | 게시글·게시판·댓글·파일 등 리소스 없음 |
| 409 | 비즈니스 예외 코드, `DATA_INTEGRITY_VIOLATION` | 중복 이름/좋아요, 작성 권한 위반 등 비즈니스 규칙 충돌 |
| 413 | `FILE_TOO_LARGE` | multipart 업로드가 설정된 요청 크기 제한 초과 시 |
| 500 | `INTERNAL_SERVER_ERROR`, `REQUEST_FAILED` | 서버 내부 오류 또는 기타 요청 처리 오류 |

## 5. 공통 규칙 및 참고

| 항목 | 규칙 |
|---|---|
| 인증 헤더 | 보호 API 요청에 `Authorization: Bearer <accessToken>` 사용 |
| 기본 권한 | 회원가입·로그인 제외 API는 인증 필요 |
| ADMIN 전용 | 게시판 생성·수정·삭제, 카테고리 생성·수정·삭제 |
| Soft Delete | 게시글과 댓글 삭제는 실제 레코드 삭제 대신 `deletedAt` 기록 |
| 첨부파일 접근 | 목록·다운로드는 로그인 사용자 접근 가능; 업로드·삭제는 게시글 작성자 또는 ADMIN |
| 업로드 저장 위치 | `app.upload.dir`, 기본값 `${user.home}/board-project-uploads` |
| 명세 범위 | GitHub `main` 브랜치의 Controller·DTO·Service·Security·Exception Handler 구현 기준 |
