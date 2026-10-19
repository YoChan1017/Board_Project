# Board_Project API 요약 명세표

> 회원가입·로그인을 제외한 API는 기본적으로 JWT 인증이 필요합니다. 세부 동작과 응답 형식은 같은 폴더의 `BackEnd_API 명세서 정리.md`를 참고하세요.

## 1. 전체 API 목록

| 기능 | 메서드 | 엔드포인트 | 인증/권한 | 성공 코드 | 요약 |
|---|---|---|---|---:|---|
| 회원가입 | POST | `/api/auth/signup` | 공개 | 201 | 회원 생성, `userId` 반환 |
| 로그인 | POST | `/api/auth/login` | 공개 | 200 | JWT 및 사용자 정보 반환 |
| 내 프로필 조회 | GET | `/api/auth/me` | 로그인 | 200 | 사용자 안전 프로필 조회 |
| 내 프로필 수정 | PUT | `/api/auth/me` | 로그인 | 200 | 닉네임·이메일 수정 |
| 비밀번호 변경 | PUT | `/api/auth/password` | 로그인 | 204 | 비밀번호 변경, 기존 토큰 무효화 |
| 회원 탈퇴 | DELETE | `/api/auth/me` | 로그인 | 204 | 계정 Soft Delete 및 익명화 |
| 게시판 목록 | GET | `/api/boards` | 로그인 | 200 | 게시판 목록 조회 |
| 게시판 상세 | GET | `/api/boards/{boardId}` | 로그인 | 200 | 게시판 1건 조회 |
| 게시판 생성 | POST | `/api/boards` | ADMIN | 201 | 게시판 생성 |
| 게시판 수정 | PUT | `/api/boards/{boardId}` | ADMIN | 200 | 게시판 정보 수정 |
| 게시판 삭제 | DELETE | `/api/boards/{boardId}` | ADMIN | 204 | 카테고리/게시글이 있으면 삭제 거부 |
| 카테고리 목록 | GET | `/api/boards/{boardId}/categories` | 로그인 | 200 | 게시판별 카테고리 목록 |
| 카테고리 생성 | POST | `/api/boards/{boardId}/categories` | ADMIN | 201 | 카테고리 생성 |
| 카테고리 상세 | GET | `/api/categories/{categoryId}` | 로그인 | 200 | 카테고리 1건 조회 |
| 카테고리 수정 | PUT | `/api/categories/{categoryId}` | ADMIN | 200 | 카테고리 이름 수정 |
| 카테고리 삭제 | DELETE | `/api/categories/{categoryId}` | ADMIN | 204 | 카테고리 삭제, 기존 게시글의 카테고리 연결 해제 |
| 게시글 목록/검색 | GET | `/api/boards/{boardId}/posts` | 로그인 | 200 | 페이지 조회, 제목·본문 검색 |
| 게시글 생성 | POST | `/api/boards/{boardId}/posts` | 로그인 | 201 | 게시글 작성 |
| 게시글 상세 | GET | `/api/posts/{postId}` | 로그인 | 200 | 상세 조회 성공 시 조회수 +1 |
| 게시글 수정 | PUT | `/api/posts/{postId}` | 작성자/ADMIN | 200 | 제목·내용·카테고리 수정 |
| 게시글 삭제 | DELETE | `/api/posts/{postId}` | 작성자/ADMIN | 204 | Soft Delete |
| 댓글 목록 | GET | `/api/posts/{postId}/comments` | 로그인 | 200 | 댓글·대댓글 조회, 삭제 댓글 자리표시 포함 |
| 댓글/대댓글 생성 | POST | `/api/posts/{postId}/comments` | 로그인 | 201 | `parentId`로 대댓글 지정 |
| 댓글 상세 | GET | `/api/comments/{commentId}` | 로그인 | 200 | 삭제되지 않은 댓글 조회 |
| 댓글 수정 | PUT | `/api/comments/{commentId}` | 작성자/ADMIN | 200 | 댓글 내용 수정 |
| 댓글 삭제 | DELETE | `/api/comments/{commentId}` | 작성자/ADMIN | 204 | Soft Delete, 대댓글 연결 보존 |
| 좋아요 상태 조회 | GET | `/api/posts/{postId}/likes` | 로그인 | 200 | 좋아요 수 및 `likedByMe` 반환 |
| 좋아요 등록 | POST | `/api/posts/{postId}/likes` | 로그인 | 201 | 이미 좋아요한 게시글이면 오류 |
| 좋아요 취소 | DELETE | `/api/posts/{postId}/likes` | 로그인 | 200 | 기존 좋아요 제거 |
| 첨부파일 목록 | GET | `/api/posts/{postId}/attachments` | 로그인 | 200 | 생성일 오름차순 목록 |
| 첨부파일 업로드 | POST | `/api/posts/{postId}/attachments` | 작성자/ADMIN | 201 | multipart 필드 `file`, 최대 파일 크기 10 MiB |
| 첨부파일 다운로드 | GET | `/api/attachments/{attachmentId}/download` | 로그인 | 200 | 파일 바이너리 다운로드 |
| 첨부파일 삭제 | DELETE | `/api/attachments/{attachmentId}` | 작성자/ADMIN | 204 | 파일 및 DB 메타데이터 삭제 |
| 내 게시글 목록 | GET | `/api/me/posts` | 로그인 | 200 | 본인이 작성한 활성 게시글 페이지·검색 |
| 내 댓글 목록 | GET | `/api/me/comments` | 로그인 | 200 | 본인이 작성한 활성 댓글 페이지·검색 |
| 관리자 회원 목록 | GET | `/api/admin/users` | ADMIN | 200 | 사용자 메타데이터 목록, 탈퇴 계정 포함 가능 |

## 2. 주요 요청 필드

| 기능 | 필드 | 필수 여부 | 검증/설명 |
|---|---|---|---|
| 회원가입 | `username` | 필수 | 4~50자, 공백 불가 |
| 회원가입 | `password` | 필수 | 8~100자, 공백 불가 |
| 회원가입 | `nickname` | 필수 | 2~50자, 공백 불가 |
| 회원가입 | `email` | 선택 | 이메일 형식, 최대 100자; 공백은 미설정 처리 |
| 로그인 | `username`, `password` | 필수 | 공백 불가 |
| 프로필 수정 | `nickname` | 필수 | 2~50자, 공백 불가 |
| 프로필 수정 | `email` | 선택 | 이메일 형식, 최대 100자; null/빈 문자열은 미설정 |
| 비밀번호 변경 | `currentPassword` | 필수 | 최대 100자 |
| 비밀번호 변경 | `newPassword` | 필수 | 8~100자, 현재 비밀번호와 달라야 함 |
| 회원 탈퇴 | `password` | 필수 | 재인증용 현재 비밀번호 |
| 회원 탈퇴 | `confirmationText` | 필수 | 정확히 `탈퇴합니다` 입력 |
| 게시판 생성/수정 | `name` | 필수 | 최대 100자, 공백 불가 |
| 게시판 생성/수정 | `description` | 선택 | 최대 255자 |
| 카테고리 생성/수정 | `name` | 필수 | 최대 100자, 공백 불가 |
| 게시글 생성/수정 | `title` | 필수 | 최대 200자, 공백 불가 |
| 게시글 생성/수정 | `content` | 필수 | 공백 불가, DTO 최대 길이 제한 없음 |
| 게시글 생성/수정 | `categoryId` | 선택 | 지정 시 현재 게시판 소속 카테고리여야 함 |
| 댓글 작성/수정 | `content` | 필수 | 최대 1000자, 공백 불가 |
| 댓글/대댓글 작성 | `parentId` | 선택 | 부모 댓글 ID; 같은 게시글의 활성 댓글이어야 함 |
| 게시글/내 활동 목록 | `page` | 선택 | 기본값 `0`, 0 이상 |
| 게시글/내 활동 목록 | `size` | 선택 | 기본값 `10`, 1~100 |
| 게시글 목록 | `keyword` | 선택 | 제목·본문 검색, 앞뒤 공백 제거 |
| 내 활동 목록 | `keyword` | 선택 | 최대 200자, 앞뒤 공백 제거 |
| 파일 업로드 | `file` | 필수 | `multipart/form-data`, 비어 있지 않은 파일, 최대 10 MiB |

## 3. 주요 응답 필드

| 기능 | 응답 필드 |
|---|---|
| 회원가입 | `userId` |
| 로그인 | `accessToken`, `userId`, `username`, `nickname`, `role` |
| 내 프로필 | `userId`, `username`, `nickname`, `email`, `role`, `createdAt`, `updatedAt` |
| 게시판 | `id`, `name`, `description` |
| 카테고리 | `id`, `boardId`, `name` |
| 게시글 목록 항목 | `id`, `categoryId`, `categoryName`, `authorNickname`, `title`, `viewCount`, `likeCount`, `createdAt` |
| 게시글 상세 | `id`, `boardId`, `categoryId`, `categoryName`, `authorId`, `authorNickname`, `title`, `content`, `viewCount`, `likeCount`, `createdAt`, `updatedAt` |
| 댓글 목록 항목 | `id`, `parentId`, `authorId`, `authorNickname`, `content`, `createdAt`, `updatedAt`, `deleted` |
| 댓글 상세/작성/수정 | `id`, `postId`, `parentId`, `authorId`, `authorNickname`, `content`, `createdAt`, `updatedAt` |
| 좋아요 | `postId`, `likeCount`, `likedByMe` |
| 첨부파일 | `id`, `postId`, `originalName`, `fileSize`, `contentType`, `createdAt`, `downloadUrl` |
| 내 게시글 항목 | `id`, `boardId`, `boardName`, `categoryName`, `title`, `viewCount`, `likeCount`, `createdAt`, `updatedAt` |
| 내 댓글 항목 | `id`, `postId`, `parentId`, `postTitle`, `boardId`, `boardName`, `categoryName`, `content`, `createdAt`, `updatedAt` |
| 관리자 회원 항목 | `userId`, `username`, `nickname`, `email`, `role`, `createdAt`, `updatedAt`, `deletedAt` |
| 페이지네이션 | Spring Data `Page` 직렬화 구조: `content`, `totalElements`, `totalPages`, `size`, `number` 등 |

## 4. 공통 오류 응답

기본 형식:

```json
{ "code": "ERROR_CODE", "message": "설명" }
```

| HTTP | 코드 예시 | 주요 조건 |
|---:|---|---|
| 400 | `VALIDATION_FAILED`, `INVALID_REQUEST_BODY`, `INVALID_PARAMETER`, `BAD_REQUEST` | 입력값·JSON·파라미터 형식 오류, 페이지 범위 위반; 서비스에 전달된 파일 크기 검증 오류도 `BAD_REQUEST`가 될 수 있음 |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` | 인증 누락/실패, 로그인 정보 오류 |
| 403 | `FORBIDDEN` | 인증은 되었지만 필요한 역할이 없거나 접근이 거부됨 |
| 404 | `RESOURCE_NOT_FOUND` | 대상 리소스가 없거나 Soft Delete되어 조회할 수 없음 |
| 409 | 비즈니스 예외 코드, `DATA_INTEGRITY_VIOLATION` | 중복, 비즈니스 권한 규칙 위반, DB 제약 충돌 |
| 413 | `FILE_TOO_LARGE` | multipart 설정의 업로드 크기 제한 초과 |
| 500 | `INTERNAL_SERVER_ERROR` | 예상하지 못한 서버 내부 오류 |

주요 비즈니스 코드: `USERNAME_ALREADY_EXISTS`, `NICKNAME_ALREADY_EXISTS`, `EMAIL_ALREADY_EXISTS`, `BOARD_NAME_ALREADY_EXISTS`, `BOARD_HAS_CATEGORIES`, `BOARD_HAS_POSTS`, `CATEGORY_NAME_ALREADY_EXISTS`, `INVALID_CATEGORY_BOARD`, `POST_ACCESS_DENIED`, `COMMENT_ACCESS_DENIED`, `ATTACHMENT_ACCESS_DENIED`, `INVALID_PARENT_COMMENT`, `POST_LIKE_ALREADY_EXISTS`.

## 5. 공통 동작 및 메모

| 항목 | 규칙 |
|---|---|
| 인증 헤더 | `Authorization: Bearer <accessToken>` |
| 기본 인증 정책 | 회원가입·로그인을 제외한 API는 인증 필요 |
| Soft Delete | 게시글, 댓글, 계정 탈퇴는 `deletedAt`을 기록하고 행을 유지 |
| 삭제 댓글 목록 | 댓글 목록에서 `deleted: true`, `authorId: null`, 삭제 안내 문자열로 표시하고 대댓글 연결을 유지 |
| 게시글 조회수 | 상세 조회 성공 시 DB 업데이트로 조회수 1 증가 |
| 첨부파일 접근 | 목록/다운로드는 로그인 사용자, 업로드/삭제는 게시글 작성자 또는 ADMIN |
| 카테고리 삭제 | DB 외래 키가 `ON DELETE SET NULL`이므로 해당 카테고리를 참조하던 게시글은 유지되고 `category_id`가 `NULL`로 변경됨 |
| 업로드 위치 | `app.upload.dir`, 기본값 `${user.home}/board-project-uploads` |
| 관리자 회원 목록 | ADMIN 전용; 전체 사용자 목록을 반환하며 페이지네이션은 없음 |
| 문서 범위 | 백엔드 구현과 DB migration을 기준으로 작성했으며, 실제 응답은 구성된 실행 환경에 따라 달라질 수 있음 |
