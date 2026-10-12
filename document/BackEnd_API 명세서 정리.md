# Board_Project REST API 명세서

- **저장소:** [`YoChan1017/Board_Project`](https://github.com/YoChan1017/Board_Project)
- **기준 브랜치:** `main`
- **기준:** 현재 저장소에 커밋된 Spring Boot Controller, Service, DTO, Security 및 예외 처리 코드
- **API Prefix:** `/api`
- **요청/응답 형식:** JSON. 첨부파일 업로드는 `multipart/form-data`, 다운로드는 바이너리
- **인증:** JWT Bearer 토큰

> 이 문서는 현재 구현을 설명합니다. 의도된 최종 설계가 아니라 코드에 실제 구현된 동작을 우선 기재했습니다. 특히 권한 거부 시 HTTP 409를 사용하는 서비스 예외와 임시 `/api/auth/me` 응답 등은 별도의 개선 후보로 표시했습니다.

## 목차

1. 공통 규칙 및 인증
2. 엔드포인트 요약
3. 인증 API
4. 게시판 API
5. 카테고리 API
6. 게시글 API
7. 댓글 API
8. 좋아요 API
9. 첨부파일 API
10. 공통 오류 응답
11. 요청/응답 DTO 요약
12. 구현상 참고 및 확인 사항

---

## 1. 공통 규칙 및 인증

### 1.1 Base URL

로컬 개발 환경의 기본 주소 예시:

```text
http://localhost:8080
```

실제 포트는 실행 환경 설정에 따라 달라질 수 있습니다.

### 1.2 JSON 헤더

JSON 요청에는 다음 헤더를 사용합니다.

```http
Content-Type: application/json
Accept: application/json
```

### 1.3 JWT 인증

회원가입과 로그인만 공개 API입니다. 그 외 API는 인증이 필요합니다.

로그인 응답의 `accessToken`을 다음 요청 헤더에 넣습니다.

```http
Authorization: Bearer <accessToken>
```

현재 JWT 유효 시간은 `jwt.expiration-ms` 환경 설정을 따르며, 기본값은 `3600000`ms(1시간)입니다.

### 1.4 역할 및 접근 정책

| 기능 | 접근 정책 |
|---|---|
| 회원가입 / 로그인 | 인증 불필요 |
| 목록·상세 조회, 댓글 작성, 좋아요, 첨부파일 다운로드 등 일반 API | 로그인 사용자 |
| 게시판 생성·수정·삭제 | `ADMIN` |
| 카테고리 생성·수정·삭제 | `ADMIN` |
| 게시글 수정·삭제 | 게시글 작성자 또는 `ADMIN` |
| 댓글 수정·삭제 | 댓글 작성자 또는 `ADMIN` |
| 첨부파일 업로드·삭제 | 해당 게시글 작성자 또는 `ADMIN` |
| 첨부파일 목록·다운로드 | 로그인 사용자. 서비스 코드에서 게시글 작성자 여부를 따로 검사하지 않음 |

보안 설정에서 관리자 전용 URL에 일반 사용자가 접근하면 `403 Forbidden`을 반환합니다. 반면 게시글·댓글·첨부파일의 작성자 검사는 `BusinessException`으로 처리되므로 현재 구현에서는 보통 `409 Conflict`가 반환됩니다. 상세 내용은 오류 응답 절을 참고하세요.

### 1.5 날짜/시간

`createdAt`, `updatedAt`은 `LocalDateTime` 기반 문자열로 반환됩니다. 시간대(offset)가 포함된 값이라고 가정하지 마세요.

---

## 2. 엔드포인트 요약

모든 엔드포인트는 별도 표시가 없는 한 JWT 인증이 필요합니다.

| 영역 | Method | Endpoint | 성공 상태 | 요약 |
|---|---|---|---:|---|
| 인증 | `POST` | `/api/auth/signup` | 201 | 회원가입 |
| 인증 | `POST` | `/api/auth/login` | 200 | 로그인 및 JWT 발급 |
| 인증 | `GET` | `/api/auth/me` | 200 | 현재 로그인 사용자명 조회(임시 구현) |
| 게시판 | `GET` | `/api/boards` | 200 | 게시판 전체 조회 |
| 게시판 | `GET` | `/api/boards/{boardId}` | 200 | 게시판 상세 조회 |
| 게시판 | `POST` | `/api/boards` | 201 | 게시판 생성(관리자) |
| 게시판 | `PUT` | `/api/boards/{boardId}` | 200 | 게시판 수정(관리자) |
| 게시판 | `DELETE` | `/api/boards/{boardId}` | 204 | 게시판 삭제(관리자) |
| 카테고리 | `GET` | `/api/boards/{boardId}/categories` | 200 | 게시판별 카테고리 조회 |
| 카테고리 | `POST` | `/api/boards/{boardId}/categories` | 201 | 카테고리 생성(관리자) |
| 카테고리 | `GET` | `/api/categories/{categoryId}` | 200 | 카테고리 상세 조회 |
| 카테고리 | `PUT` | `/api/categories/{categoryId}` | 200 | 카테고리 수정(관리자) |
| 카테고리 | `DELETE` | `/api/categories/{categoryId}` | 204 | 카테고리 삭제(관리자) |
| 게시글 | `GET` | `/api/boards/{boardId}/posts` | 200 | 게시글 페이지 조회 및 검색 |
| 게시글 | `POST` | `/api/boards/{boardId}/posts` | 201 | 게시글 작성 |
| 게시글 | `GET` | `/api/posts/{postId}` | 200 | 게시글 상세 조회(조회수 증가) |
| 게시글 | `PUT` | `/api/posts/{postId}` | 200 | 게시글 수정(작성자/관리자) |
| 게시글 | `DELETE` | `/api/posts/{postId}` | 204 | 게시글 삭제(Soft Delete) |
| 댓글 | `GET` | `/api/posts/{postId}/comments` | 200 | 게시글 댓글 목록 조회 |
| 댓글 | `POST` | `/api/posts/{postId}/comments` | 201 | 댓글/대댓글 작성 |
| 댓글 | `GET` | `/api/comments/{commentId}` | 200 | 댓글 상세 조회 |
| 댓글 | `PUT` | `/api/comments/{commentId}` | 200 | 댓글 수정(작성자/관리자) |
| 댓글 | `DELETE` | `/api/comments/{commentId}` | 204 | 댓글 삭제(Soft Delete) |
| 좋아요 | `GET` | `/api/posts/{postId}/likes` | 200 | 좋아요 수 및 내 상태 조회 |
| 좋아요 | `POST` | `/api/posts/{postId}/likes` | 201 | 좋아요 등록 |
| 좋아요 | `DELETE` | `/api/posts/{postId}/likes` | 200 | 좋아요 취소 |
| 첨부파일 | `GET` | `/api/posts/{postId}/attachments` | 200 | 첨부파일 목록 조회 |
| 첨부파일 | `POST` | `/api/posts/{postId}/attachments` | 201 | 첨부파일 업로드 |
| 첨부파일 | `GET` | `/api/attachments/{attachmentId}/download` | 200 | 파일 다운로드 |
| 첨부파일 | `DELETE` | `/api/attachments/{attachmentId}` | 204 | 첨부파일 삭제 |

---

## 3. 인증 API

### 3.1 회원가입

`POST /api/auth/signup`

인증 불필요.

**요청 본문**

```json
{
  "username": "boarduser01",
  "password": "examplePassword123",
  "nickname": "게시판유저",
  "email": "user@example.com"
}
```

| 필드 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `username` | string | 예 | 공백 불가, 4~50자 |
| `password` | string | 예 | 공백 불가, 8~100자 |
| `nickname` | string | 예 | 공백 불가, 2~50자 |
| `email` | string | 아니요 | 제공 시 이메일 형식, 최대 100자 |

**성공: `201 Created`**

```json
{
  "userId": 1
}
```

비밀번호는 서버에서 인코딩해 저장하며, 신규 사용자의 역할은 `USER`로 설정됩니다.

가능한 비즈니스 오류:

| HTTP | `code` | 의미 |
|---:|---|---|
| 409 | `USERNAME_ALREADY_EXISTS` | 이미 사용 중인 username |
| 409 | `NICKNAME_ALREADY_EXISTS` | 이미 사용 중인 nickname |
| 409 | `EMAIL_ALREADY_EXISTS` | 이미 사용 중인 email |
| 400 | `VALIDATION_FAILED` | 요청 필드 검증 실패 |

### 3.2 로그인

`POST /api/auth/login`

인증 불필요.

**요청 본문**

```json
{
  "username": "boarduser01",
  "password": "examplePassword123"
}
```

| 필드 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `username` | string | 예 | 공백 불가 |
| `password` | string | 예 | 공백 불가 |

**성공: `200 OK`**

```json
{
  "accessToken": "<JWT>",
  "userId": 1,
  "username": "boarduser01",
  "nickname": "게시판유저",
  "role": "USER"
}
```

로그인 실패 또는 삭제된 사용자 로그인 시 `401 Unauthorized`와 `code: INVALID_CREDENTIALS`를 반환합니다.

### 3.3 현재 로그인 사용자 조회(임시)

`GET /api/auth/me`

인증 필요.

**성공: `200 OK`**

```json
{
  "username": "boarduser01"
}
```

현재 Controller에 `// 임시` 주석이 붙어 있으며 username만 반환합니다. 사용자 ID·닉네임·역할 전체를 제공하는 프로필 API로 간주하지 마세요.

---

## 4. 게시판 API

### 4.1 게시판 전체 조회

`GET /api/boards`

**성공: `200 OK`** — `BoardResponse` 배열.

```json
[
  {
    "id": 1,
    "name": "자유게시판",
    "description": "자유롭게 이야기하는 게시판"
  }
]
```

### 4.2 게시판 상세 조회

`GET /api/boards/{boardId}`

Path parameter: `boardId` (integer / Long, 필수)

**성공: `200 OK`** — `BoardResponse` 한 개. 게시판이 없으면 404.

### 4.3 게시판 생성

`POST /api/boards` — `ADMIN` 전용.

```json
{
  "name": "질문게시판",
  "description": "개발 관련 질문을 올리는 게시판"
}
```

| 필드 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `name` | string | 예 | 공백 불가, 최대 100자 |
| `description` | string 또는 null | 아니요 | 최대 255자 |

**성공: `201 Created`** — `BoardResponse` 반환.

동일한 게시판 이름이 있으면 `409 BOARD_NAME_ALREADY_EXISTS`.

### 4.4 게시판 수정

`PUT /api/boards/{boardId}` — `ADMIN` 전용.

요청 필드는 게시판 생성과 같습니다. **성공: `200 OK`** — 갱신된 `BoardResponse`.

게시판이 없으면 404, 다른 게시판이 동일한 이름을 사용 중이면 `409 BOARD_NAME_ALREADY_EXISTS`.

### 4.5 게시판 삭제

`DELETE /api/boards/{boardId}` — `ADMIN` 전용.

**성공: `204 No Content`** — 응답 본문 없음.

게시판에 카테고리가 있으면 `409 BOARD_HAS_CATEGORIES`, 게시판에 게시글이 있으면 `409 BOARD_HAS_POSTS`를 반환합니다. 현재 서비스는 실제 DELETE를 수행합니다. 게시글이 존재하는지 검사할 때 soft-deleted 게시글만 따로 제외하지 않습니다.

---

## 5. 카테고리 API

### 5.1 게시판별 카테고리 목록 조회

`GET /api/boards/{boardId}/categories`

**성공: `200 OK`** — `CategoryResponse` 배열.

```json
[
  {
    "id": 3,
    "boardId": 1,
    "name": "Spring"
  }
]
```

존재하지 않는 게시판이면 404입니다. 명시적인 정렬 조건은 서비스에서 설정하지 않습니다.

### 5.2 카테고리 생성

`POST /api/boards/{boardId}/categories` — `ADMIN` 전용.

```json
{
  "name": "Spring"
}
```

`name`은 필수, 공백 불가, 최대 100자입니다.

**성공: `201 Created`** — `CategoryResponse` 반환.

| HTTP | `code` | 의미 |
|---:|---|---|
| 404 | `RESOURCE_NOT_FOUND` | 게시판 없음 |
| 409 | `CATEGORY_NAME_ALREADY_EXISTS` | 해당 게시판에 같은 이름의 카테고리가 존재함 |

### 5.3 카테고리 상세 조회

`GET /api/categories/{categoryId}`

**성공: `200 OK`** — `{ "id": 3, "boardId": 1, "name": "Spring" }` 형태의 `CategoryResponse`. 없으면 404.

### 5.4 카테고리 수정

`PUT /api/categories/{categoryId}` — `ADMIN` 전용.

요청 본문은 카테고리 생성과 같습니다. **성공: `200 OK`** — 수정된 `CategoryResponse`.

동일 게시판 내 이름 중복 시 `409 CATEGORY_NAME_ALREADY_EXISTS`, 대상 카테고리가 없으면 404.

### 5.5 카테고리 삭제

`DELETE /api/categories/{categoryId}` — `ADMIN` 전용.

**성공: `204 No Content`**. 없는 카테고리는 404입니다. 카테고리가 게시글에서 참조되고 데이터베이스 제약조건이 삭제를 막는 경우 공통 오류 처리에 따라 409가 될 수 있습니다.

---

## 6. 게시글 API

### 6.1 게시글 목록 / 검색 / 페이지네이션

`GET /api/boards/{boardId}/posts`

**Query parameters**

| 파라미터 | 타입 | 기본값 | 규칙 |
|---|---|---:|---|
| `page` | integer | `0` | 0 이상, 0부터 시작 |
| `size` | integer | `10` | 1~100 |
| `keyword` | string | 생략 | 검색어 앞뒤 공백 제거 후 검색 |

예시:

```http
GET /api/boards/1/posts?page=0&size=10&keyword=스프링
Authorization: Bearer <JWT>
```

검색은 활성 게시글 중 **제목 또는 본문**에 키워드가 포함되는 게시글을 반환합니다. 쿼리는 `LOWER()`를 적용하므로 대소문자를 구분하지 않도록 작성되어 있습니다. null 또는 공백뿐인 키워드는 일반 목록 조회로 처리합니다.

정렬: `createdAt DESC`, 같은 작성 시각에서는 `id DESC`.

**성공: `200 OK`** — Spring Data `Page<PostListResponse>` 직렬화 결과. `content` 배열의 각 항목은 다음 형태입니다.

```json
{
  "content": [
    {
      "id": 12,
      "categoryId": 3,
      "categoryName": "Spring",
      "authorNickname": "게시판유저",
      "title": "Spring 설정 질문",
      "viewCount": 5,
      "likeCount": 2,
      "createdAt": "2026-10-12T10:30:00"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 10,
  "number": 0,
  "numberOfElements": 1,
  "first": true,
  "last": true,
  "empty": false
}
```

> `Page`의 나머지 메타데이터(예: `pageable`, `sort`)는 사용 중인 Spring Data/Jackson 버전의 직렬화 결과에 따라 함께 포함될 수 있습니다. 프론트엔드 연동 전 실제 실행 응답을 한 번 확인하는 것이 좋습니다.

오류:

| 입력/상황 | HTTP | 오류 코드 |
|---|---:|---|
| `page < 0` | 400 | `BAD_REQUEST` |
| `size < 1` 또는 `size > 100` | 400 | `BAD_REQUEST` |
| `page=abc` 등 숫자 변환 실패 | 400 | `INVALID_PARAMETER` |
| 게시판 없음 | 404 | `RESOURCE_NOT_FOUND` |

### 6.2 게시글 작성

`POST /api/boards/{boardId}/posts`

인증 필요. 작성자는 로그인 JWT의 사용자로 결정합니다.

```json
{
  "title": "Spring Boot 질문",
  "content": "설정 방법을 알고 싶습니다.",
  "categoryId": 3
}
```

| 필드 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `title` | string | 예 | 공백 불가, 최대 200자 |
| `content` | string | 예 | 공백 불가, DTO에 최대 길이 검증 없음 |
| `categoryId` | integer 또는 null | 아니요 | 제공하면 해당 게시판 소속 카테고리인지 검사 |

**성공: `201 Created`** — 상세 `PostResponse` 반환. `viewCount`, `likeCount`는 생성 시 0으로 초기화됩니다.

오류: 게시판 없음 404, 카테고리 없음 404, 다른 게시판 소속 카테고리면 `409 INVALID_CATEGORY_BOARD`, 요청 필드 오류 400.

### 6.3 게시글 상세 조회

`GET /api/posts/{postId}`

**성공: `200 OK`** — `PostResponse` 반환. 상세 조회가 성공할 때마다 조회수가 1 증가합니다. 삭제된 게시글 또는 존재하지 않는 게시글은 404.

```json
{
  "id": 12,
  "boardId": 1,
  "categoryId": 3,
  "categoryName": "Spring",
  "authorId": 1,
  "authorNickname": "게시판유저",
  "title": "Spring Boot 질문",
  "content": "설정 방법을 알고 싶습니다.",
  "viewCount": 6,
  "likeCount": 2,
  "createdAt": "2026-10-12T10:30:00",
  "updatedAt": "2026-10-12T11:00:00"
}
```

카테고리가 지정되지 않은 게시글은 `categoryId`, `categoryName`이 `null`일 수 있습니다.

### 6.4 게시글 수정

`PUT /api/posts/{postId}` — 작성자 본인 또는 `ADMIN`.

요청 본문은 게시글 작성과 같습니다. `categoryId: null` 또는 생략 시 카테고리 연결이 해제됩니다.

**성공: `200 OK`** — 수정된 `PostResponse`.

오류: 게시글 없음 404, 카테고리 없음 404, 타 게시판 카테고리 `409 INVALID_CATEGORY_BOARD`, 작성자 권한 위반 `409 POST_ACCESS_DENIED`.

### 6.5 게시글 삭제

`DELETE /api/posts/{postId}` — 작성자 본인 또는 `ADMIN`.

**성공: `204 No Content`** — 응답 본문 없음. 실제 행을 삭제하지 않고 `deletedAt`에 현재 시각을 기록하는 Soft Delete입니다. 일반 목록·상세 조회에서 제외됩니다.

작성자 권한 위반은 현재 구현에서 `409 POST_ACCESS_DENIED`입니다.

---

## 7. 댓글 API

### 7.1 게시글 댓글 목록 조회

`GET /api/posts/{postId}/comments`

**성공: `200 OK`** — `CommentListResponse` 배열이며 생성 시각 오름차순입니다.

```json
[
  {
    "id": 21,
    "parentId": null,
    "authorId": 1,
    "authorNickname": "게시판유저",
    "content": "좋은 질문이네요.",
    "createdAt": "2026-10-12T12:00:00",
    "updatedAt": "2026-10-12T12:00:00"
  }
]
```

삭제된 게시글이면 404이며 삭제된 댓글은 목록에서 제외됩니다.

### 7.2 댓글 / 대댓글 작성

`POST /api/posts/{postId}/comments`

```json
{
  "content": "답변 감사합니다.",
  "parentId": null
}
```

| 필드 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `content` | string | 예 | 공백 불가, 최대 1000자 |
| `parentId` | integer 또는 null | 아니요 | null이면 일반 댓글, 값이 있으면 부모 댓글 ID |

**성공: `201 Created`** — `CommentResponse` 반환. `parentId`가 지정되면 부모 댓글이 존재하고 삭제되지 않았으며 같은 게시글에 속하는지 검사합니다.

오류: 게시글/부모 댓글 없음 404, 다른 게시글에 속한 부모 댓글이면 `409 INVALID_PARENT_COMMENT`, 검증 오류 400.

### 7.3 댓글 상세 조회

`GET /api/comments/{commentId}`

**성공: `200 OK`** — `CommentResponse` 반환.

```json
{
  "id": 21,
  "postId": 12,
  "parentId": null,
  "authorId": 1,
  "authorNickname": "게시판유저",
  "content": "답변 감사합니다.",
  "createdAt": "2026-10-12T12:00:00",
  "updatedAt": "2026-10-12T12:00:00"
}
```

삭제되었거나 존재하지 않는 댓글은 404입니다.

### 7.4 댓글 수정

`PUT /api/comments/{commentId}` — 작성자 본인 또는 `ADMIN`.

```json
{
  "content": "수정한 댓글입니다."
}
```

**성공: `200 OK`** — `CommentResponse` 반환. 콘텐츠 검증은 댓글 작성과 동일합니다. 권한 위반은 현재 구현에서 `409 COMMENT_ACCESS_DENIED`입니다.

### 7.5 댓글 삭제

`DELETE /api/comments/{commentId}` — 작성자 본인 또는 `ADMIN`.

**성공: `204 No Content`**. 실제 DELETE 대신 `deletedAt`을 기록합니다. 권한 위반은 현재 구현에서 `409 COMMENT_ACCESS_DENIED`입니다.

---

## 8. 좋아요 API

세 엔드포인트 모두 인증이 필요합니다.

### 8.1 좋아요 상태 조회

`GET /api/posts/{postId}/likes`

**성공: `200 OK`**

```json
{
  "postId": 12,
  "likeCount": 2,
  "likedByMe": true
}
```

삭제되지 않은 게시글이어야 하며, `likedByMe`는 현재 로그인 사용자의 좋아요 여부입니다.

### 8.2 좋아요 등록

`POST /api/posts/{postId}/likes`

요청 본문 없음.

**성공: `201 Created`** — 좋아요 수와 `likedByMe: true` 반환.

이미 좋아요를 등록했다면 `409 POST_LIKE_ALREADY_EXISTS`입니다. 게시글이 없거나 삭제되었다면 404.

### 8.3 좋아요 취소

`DELETE /api/posts/{postId}/likes`

요청 본문 없음.

**성공: `200 OK`**

```json
{
  "postId": 12,
  "likeCount": 1,
  "likedByMe": false
}
```

해당 사용자에게 좋아요 기록이 없으면 404 `RESOURCE_NOT_FOUND`입니다. 좋아요 수는 좋아요 레코드 수를 기준으로 갱신합니다.

---

## 9. 첨부파일 API

### 9.1 첨부파일 목록 조회

`GET /api/posts/{postId}/attachments`

**성공: `200 OK`** — `AttachmentResponse` 배열이며 `createdAt ASC` 순서.

```json
[
  {
    "id": 7,
    "postId": 12,
    "originalName": "example.pdf",
    "fileSize": 245760,
    "contentType": "application/pdf",
    "createdAt": "2026-10-12T13:00:00",
    "downloadUrl": "/api/attachments/7/download"
  }
]
```

`fileSize`는 바이트 단위입니다. `contentType`은 값이 없거나 유효하지 않을 경우 `null`일 수 있습니다. 존재하지 않거나 삭제된 게시글은 404입니다.

### 9.2 첨부파일 업로드

`POST /api/posts/{postId}/attachments`

인증 필요. 게시글 작성자 또는 `ADMIN`만 가능합니다.

**Content-Type:** `multipart/form-data`

폼 필드명은 반드시 `file`이어야 합니다.

```text
file: <선택한 파일>
```

제약사항:

- 빈 파일은 허용하지 않습니다.
- 파일당 최대 크기는 10 MiB(10 × 1024 × 1024 바이트)입니다.
- 원본 파일명은 경로 요소를 제거한 뒤 보관하고 저장 파일명은 UUID 기반으로 생성합니다.
- 저장 파일의 실제 경로는 `app.upload.dir` 설정을 사용하고, 기본값은 `${user.home}/board-project-uploads`입니다.
- 파일 확장자는 1~10자의 영숫자만 안전 확장자로 사용합니다. 확장자가 안전하지 않으면 저장 이름에서 제외됩니다.

**성공: `201 Created`** — `AttachmentResponse` 반환 및 `Location` 헤더 설정.

일반 검증 오류는 400, 작성자 권한 위반은 `409 ATTACHMENT_ACCESS_DENIED`, 요청/파일 크기 제한을 Spring Multipart 단계에서 초과하면 `413 FILE_TOO_LARGE`가 될 수 있습니다.

### 9.3 첨부파일 다운로드

`GET /api/attachments/{attachmentId}/download`

인증 필요. 서비스 코드는 다운로드에 대해 게시글 작성자 여부를 따로 확인하지 않으므로 로그인한 사용자는 파일이 연결된 활성 게시글의 첨부파일을 다운로드할 수 있습니다.

**성공: `200 OK`** — 파일 바이너리 응답.

응답 헤더:

```http
Content-Type: application/octet-stream
Content-Disposition: attachment; filename*=UTF-8''...
X-Content-Type-Options: nosniff
```

첨부파일 DB 레코드 또는 실제 파일이 없으면 404, 연결된 게시글이 Soft Delete된 경우도 다운로드할 수 없습니다.

### 9.4 첨부파일 삭제

`DELETE /api/attachments/{attachmentId}` — 첨부파일이 연결된 게시글의 작성자 또는 `ADMIN`.

**성공: `204 No Content`** — 파일과 DB 레코드를 삭제합니다.

파일 삭제 실패 시 `500 REQUEST_FAILED`가 될 수 있고, 작성자 권한 위반은 `409 ATTACHMENT_ACCESS_DENIED`입니다. 현재 서비스에서는 연결된 게시글이 Soft Delete된 경우에도 권한이 맞으면 첨부파일 삭제를 진행할 수 있습니다.

---

## 10. 공통 오류 응답

공통 JSON 형태:

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "게시글을 찾을 수 없습니다."
}
```

| HTTP 상태 | `code` | 발생 예 |
|---:|---|---|
| 400 | `VALIDATION_FAILED` | `@Valid` 요청 DTO 검증 실패 |
| 400 | `INVALID_REQUEST_BODY` | JSON 요청 본문 파싱 실패 |
| 400 | `INVALID_PARAMETER` | 경로/쿼리 파라미터 타입 변환 실패 |
| 400 | `BAD_REQUEST` | 잘못된 페이지/크기 값 등 `ResponseStatusException`의 400 |
| 401 | `UNAUTHORIZED` | 토큰 누락, 유효하지 않거나 만료된 JWT |
| 401 | `INVALID_CREDENTIALS` | 로그인 정보가 맞지 않거나 삭제된 사용자 |
| 403 | `FORBIDDEN` | URL 수준 관리자 전용 접근 권한 부족 |
| 404 | `RESOURCE_NOT_FOUND` | 게시판·카테고리·게시글·댓글·첨부파일 등 미발견 |
| 409 | 비즈니스 예외 코드 | 중복 값, 관계 제약 위반, 현재 코드의 작성자 권한 검사 실패 등 |
| 409 | `DATA_INTEGRITY_VIOLATION` | DB 무결성 제약 위반 |
| 413 | `FILE_TOO_LARGE` | Multipart 최대 크기 제한 초과 |
| 500 | `INTERNAL_SERVER_ERROR` | 예상하지 못한 예외 |

### 10.1 주요 비즈니스 오류 코드

| `code` | 일반 HTTP 상태 | 의미 |
|---|---:|---|
| `USERNAME_ALREADY_EXISTS` | 409 | 중복 username |
| `NICKNAME_ALREADY_EXISTS` | 409 | 중복 nickname |
| `EMAIL_ALREADY_EXISTS` | 409 | 중복 email |
| `BOARD_NAME_ALREADY_EXISTS` | 409 | 중복 게시판 이름 |
| `BOARD_HAS_CATEGORIES` | 409 | 카테고리가 남아 있어 게시판 삭제 불가 |
| `BOARD_HAS_POSTS` | 409 | 게시글이 남아 있어 게시판 삭제 불가 |
| `CATEGORY_NAME_ALREADY_EXISTS` | 409 | 해당 게시판의 중복 카테고리 이름 |
| `INVALID_CATEGORY_BOARD` | 409 | 게시글 카테고리가 다른 게시판 소속 |
| `POST_ACCESS_DENIED` | 409 | 게시글 수정/삭제 권한 없음 |
| `INVALID_PARENT_COMMENT` | 409 | 부모 댓글이 현재 게시글에 속하지 않음 |
| `COMMENT_ACCESS_DENIED` | 409 | 댓글 수정/삭제 권한 없음 |
| `POST_LIKE_ALREADY_EXISTS` | 409 | 이미 좋아요를 등록함 |
| `ATTACHMENT_ACCESS_DENIED` | 409 | 첨부파일 업로드/삭제 권한 없음 |

`BusinessException`은 공통 예외 처리기에서 HTTP 409로 변환됩니다. 서비스 레벨의 작성자 권한 오류를 REST 관례대로 403으로 통일하려면 예외 타입 또는 핸들러를 별도로 변경해야 합니다.

### 10.2 검증 오류 예시

```json
{
  "code": "VALIDATION_FAILED",
  "message": "title: 제목은 필수입니다."
}
```

여러 필드가 실패하면 메시지 문자열에 쉼표로 연결됩니다. 현재 `ErrorResponse`는 `code`, `message` 두 필드만 포함합니다.

---

## 11. 요청/응답 DTO 요약

| DTO | 필드 |
|---|---|
| `SignupRequest` | `username`, `password`, `nickname`, `email` |
| `LoginRequest` | `username`, `password` |
| `LoginResponse` | `accessToken`, `userId`, `username`, `nickname`, `role` |
| `BoardCreateRequest` / `BoardUpdateRequest` | `name`, `description` |
| `BoardResponse` | `id`, `name`, `description` |
| `CategoryCreateRequest` / `CategoryUpdateRequest` | `name` |
| `CategoryResponse` | `id`, `boardId`, `name` |
| `PostCreateRequest` / `PostUpdateRequest` | `title`, `content`, `categoryId` |
| `PostListResponse` | `id`, `categoryId`, `categoryName`, `authorNickname`, `title`, `viewCount`, `likeCount`, `createdAt` |
| `PostResponse` | `id`, `boardId`, `categoryId`, `categoryName`, `authorId`, `authorNickname`, `title`, `content`, `viewCount`, `likeCount`, `createdAt`, `updatedAt` |
| `CommentCreateRequest` | `content`, `parentId` |
| `CommentUpdateRequest` | `content` |
| `CommentListResponse` | `id`, `parentId`, `authorId`, `authorNickname`, `content`, `createdAt`, `updatedAt` |
| `CommentResponse` | `id`, `postId`, `parentId`, `authorId`, `authorNickname`, `content`, `createdAt`, `updatedAt` |
| `PostLikeResponse` | `postId`, `likeCount`, `likedByMe` |
| `AttachmentResponse` | `id`, `postId`, `originalName`, `fileSize`, `contentType`, `createdAt`, `downloadUrl` |
| `ErrorResponse` | `code`, `message` |

---

## 12. 구현상 참고 및 확인 사항

1. **`GET /api/auth/me`는 임시 API입니다.** 현재 username만 반환합니다.
2. **작성자 권한 오류 상태 코드가 일관되지 않습니다.** 게시판·카테고리 관리자 URL 수준 거부는 403이지만, 게시글·댓글·첨부파일의 서비스 레벨 권한 오류는 `BusinessException`으로 409를 반환합니다.
3. **첨부파일 다운로드는 공개 API가 아닙니다.** `SecurityConfig`의 `anyRequest().authenticated()`에 따라 로그인 필요하지만, 파일 소유자 여부는 서비스에서 별도로 확인하지 않습니다.
4. **게시글·댓글은 Soft Delete를 사용합니다.** 실제 DB 행을 삭제하는 것이 아니라 `deletedAt`을 기록합니다. 게시판·카테고리·좋아요·첨부파일은 별도 로직에 따라 실제 삭제합니다.
5. **페이지 응답의 전체 직렬화 구조는 런타임 확인을 권장합니다.** 게시글 목록은 `Page<PostListResponse>`를 그대로 반환합니다.
6. **파일 업로드 크기 설정이 두 곳에 있습니다.** 서비스 코드의 10 MiB 검증은 `400 BAD_REQUEST`를 발생시키고, Spring Multipart 계층의 최대 크기 초과 처리는 `413 FILE_TOO_LARGE`가 될 수 있습니다.
7. **검증 범위:** 문서는 저장소의 현재 Controller·Service·DTO·Security·Exception Handler 코드를 기반으로 작성했습니다. 여기에 기재한 모든 엔드포인트를 이번 작업에서 실제 HTTP 호출로 재시험한 것은 아닙니다. 기존 개발 문서에는 게시글 페이지네이션/검색 및 인증 관련 17개 테스트가 통과한 결과가 기록되어 있습니다.

