# Board_Project REST API 명세서

## 목차

1. 공통 규칙 및 인증
2. 전체 엔드포인트
3. 인증 및 계정 API
4. 게시판 API
5. 카테고리 API
6. 게시글 API
7. 댓글 API
8. 좋아요 API
9. 첨부파일 API
10. 내 활동 API
11. 관리자 회원 API
12. 공통 오류 응답
13. DTO 요약
14. 구현상 확인 사항

---

## 1. 공통 규칙 및 인증

### 1.1 Base URL

로컬 개발 환경의 기본 주소는 다음과 같습니다. 실제 포트는 실행 설정에 따라 달라질 수 있습니다.

```text
http://localhost:8080
```

### 1.2 요청 헤더

JSON 본문을 보내는 요청은 다음 헤더를 사용합니다.

```http
Content-Type: application/json
Accept: application/json
```

인증이 필요한 API에는 로그인 응답에서 받은 `accessToken`을 전달합니다.

```http
Authorization: Bearer <accessToken>
```

### 1.3 인증 및 권한

| 기능 | 접근 정책 |
|---|---|
| 회원가입, 로그인 | 인증 불필요 |
| 그 외 API | 기본적으로 로그인 필요 |
| 게시판 생성·수정·삭제 | `ADMIN` |
| 카테고리 생성·수정·삭제 | `ADMIN` |
| 게시글 수정·삭제 | 게시글 작성자 또는 `ADMIN` |
| 댓글 수정·삭제 | 댓글 작성자 또는 `ADMIN` |
| 첨부파일 업로드·삭제 | 게시글 작성자 또는 `ADMIN` |
| 첨부파일 목록·다운로드 | 로그인 사용자. 파일 소유자 여부를 별도로 검사하지 않음 |
| 관리자 회원 목록 | `ADMIN` 전용 의도. 현재 권한 처리의 확인 사항은 14절 참고 |

JWT 만료 시간은 `jwt.expiration-ms` 설정을 따르며 기본값은 `3600000`ms(1시간)입니다. 비밀번호 변경 및 계정 탈퇴 시 `tokenVersion`이 증가하여 기존 토큰을 무효화하도록 구현되어 있습니다.

### 1.4 날짜/시간 및 ID

- `createdAt`, `updatedAt`, `deletedAt`은 `LocalDateTime` 직렬화 문자열이며, 응답에 UTC offset이 포함된다고 가정하면 안 됩니다.
- 식별자와 주요 리소스 ID는 Java `Long`을 사용합니다. JSON 숫자로 표현됩니다.
- 게시글·댓글·계정 탈퇴는 Soft Delete 방식입니다. 리소스 종류에 따라 삭제 시점과 반환 정책이 다릅니다.

---

## 2. 전체 엔드포인트

별도 표시가 없는 API는 JWT 인증이 필요합니다.

| 영역 | Method | Endpoint | 성공 | 인증/권한 | 설명 |
|---|---|---|---:|---|---|
| 인증 | `POST` | `/api/auth/signup` | 201 | 공개 | 회원가입 |
| 인증 | `POST` | `/api/auth/login` | 200 | 공개 | 로그인 및 JWT 발급 |
| 계정 | `GET` | `/api/auth/me` | 200 | 로그인 | 내 프로필 조회 |
| 계정 | `PUT` | `/api/auth/me` | 200 | 로그인 | 내 프로필 수정 |
| 계정 | `PUT` | `/api/auth/password` | 204 | 로그인 | 비밀번호 변경 및 기존 토큰 무효화 |
| 계정 | `DELETE` | `/api/auth/me` | 204 | 로그인 | 계정 탈퇴(Soft Delete) |
| 게시판 | `GET` | `/api/boards` | 200 | 로그인 | 게시판 목록 |
| 게시판 | `GET` | `/api/boards/{boardId}` | 200 | 로그인 | 게시판 상세 |
| 게시판 | `POST` | `/api/boards` | 201 | ADMIN | 게시판 생성 |
| 게시판 | `PUT` | `/api/boards/{boardId}` | 200 | ADMIN | 게시판 수정 |
| 게시판 | `DELETE` | `/api/boards/{boardId}` | 204 | ADMIN | 게시판 삭제 |
| 카테고리 | `GET` | `/api/boards/{boardId}/categories` | 200 | 로그인 | 게시판별 카테고리 목록 |
| 카테고리 | `POST` | `/api/boards/{boardId}/categories` | 201 | ADMIN | 카테고리 생성 |
| 카테고리 | `GET` | `/api/categories/{categoryId}` | 200 | 로그인 | 카테고리 상세 |
| 카테고리 | `PUT` | `/api/categories/{categoryId}` | 200 | ADMIN | 카테고리 수정 |
| 카테고리 | `DELETE` | `/api/categories/{categoryId}` | 204 | ADMIN | 카테고리 삭제 |
| 게시글 | `GET` | `/api/boards/{boardId}/posts` | 200 | 로그인 | 게시글 페이지·검색 |
| 게시글 | `POST` | `/api/boards/{boardId}/posts` | 201 | 로그인 | 게시글 작성 |
| 게시글 | `GET` | `/api/posts/{postId}` | 200 | 로그인 | 게시글 상세 및 조회수 +1 |
| 게시글 | `PUT` | `/api/posts/{postId}` | 200 | 작성자/ADMIN | 게시글 수정 |
| 게시글 | `DELETE` | `/api/posts/{postId}` | 204 | 작성자/ADMIN | 게시글 Soft Delete |
| 댓글 | `GET` | `/api/posts/{postId}/comments` | 200 | 로그인 | 댓글·대댓글 목록(삭제 댓글 자리표시 포함) |
| 댓글 | `POST` | `/api/posts/{postId}/comments` | 201 | 로그인 | 댓글·대댓글 작성 |
| 댓글 | `GET` | `/api/comments/{commentId}` | 200 | 로그인 | 댓글 상세 |
| 댓글 | `PUT` | `/api/comments/{commentId}` | 200 | 작성자/ADMIN | 댓글 수정 |
| 댓글 | `DELETE` | `/api/comments/{commentId}` | 204 | 작성자/ADMIN | 댓글 Soft Delete |
| 좋아요 | `GET` | `/api/posts/{postId}/likes` | 200 | 로그인 | 좋아요 수 및 내 상태 |
| 좋아요 | `POST` | `/api/posts/{postId}/likes` | 201 | 로그인 | 좋아요 등록 |
| 좋아요 | `DELETE` | `/api/posts/{postId}/likes` | 200 | 로그인 | 좋아요 취소 |
| 첨부파일 | `GET` | `/api/posts/{postId}/attachments` | 200 | 로그인 | 게시글 첨부파일 목록 |
| 첨부파일 | `POST` | `/api/posts/{postId}/attachments` | 201 | 작성자/ADMIN | 첨부파일 업로드 |
| 첨부파일 | `GET` | `/api/attachments/{attachmentId}/download` | 200 | 로그인 | 파일 바이너리 다운로드 |
| 첨부파일 | `DELETE` | `/api/attachments/{attachmentId}` | 204 | 작성자/ADMIN | 첨부파일 삭제 |
| 내 활동 | `GET` | `/api/me/posts` | 200 | 로그인 | 내가 작성한 게시글 페이지·검색 |
| 내 활동 | `GET` | `/api/me/comments` | 200 | 로그인 | 내가 작성한 댓글 페이지·검색 |
| 관리자 | `GET` | `/api/admin/users` | 200 | ADMIN 의도 | 회원 목록(탈퇴 계정 포함 가능) |

---

## 3. 인증 및 계정 API

### 3.1 회원가입

`POST /api/auth/signup` — 인증 불필요.

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
| `email` | string/null | 아니요 | 제공 시 이메일 형식, 최대 100자. 공백은 null로 정규화 |

**성공 `201 Created`**

```json
{ "userId": 1 }
```

비밀번호는 인코딩해 저장하고 신규 역할은 `USER`로 설정합니다. 중복 `username`, `nickname`, `email`은 각각 `409` (`USERNAME_ALREADY_EXISTS`, `NICKNAME_ALREADY_EXISTS`, `EMAIL_ALREADY_EXISTS`)입니다.

### 3.2 로그인

`POST /api/auth/login` — 인증 불필요.

```json
{
  "username": "boarduser01",
  "password": "examplePassword123"
}
```

두 필드는 필수이며 공백만 입력할 수 없습니다.

**성공 `200 OK`**

```json
{
  "accessToken": "<JWT>",
  "userId": 1,
  "username": "boarduser01",
  "nickname": "게시판유저",
  "role": "USER"
}
```

계정이 없거나 비밀번호가 틀리거나 탈퇴한 계정이면 `401 Unauthorized`, `code: INVALID_CREDENTIALS`를 반환합니다.

### 3.3 내 프로필 조회

`GET /api/auth/me`

**성공 `200 OK`**

```json
{
  "userId": 1,
  "username": "boarduser01",
  "nickname": "게시판유저",
  "email": "user@example.com",
  "role": "USER",
  "createdAt": "2026-10-18T10:00:00",
  "updatedAt": "2026-10-18T10:00:00"
}
```

비밀번호 해시나 토큰 내부 값은 반환하지 않습니다. 이메일이 미설정이면 `email`은 `null`일 수 있습니다.

### 3.4 내 프로필 수정

`PUT /api/auth/me`

```json
{
  "nickname": "새닉네임",
  "email": "new@example.com"
}
```

| 필드 | 필수 | 검증/동작 |
|---|---|---|
| `nickname` | 예 | 공백 불가, 2~50자 |
| `email` | 아니요 | 지정 시 이메일 형식, 최대 100자. null/빈 문자열은 미설정 처리 |

**성공 `200 OK`** — 갱신된 `ProfileResponse`를 반환합니다. 본인 프로필만 변경할 수 있으며 `username`, `role`은 이 API로 변경할 수 없습니다. 이미 사용 중인 닉네임/이메일은 `409` (`NICKNAME_ALREADY_EXISTS`, `EMAIL_ALREADY_EXISTS`)입니다.

### 3.5 비밀번호 변경

`PUT /api/auth/password`

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

- `currentPassword`: 필수, 최대 100자.
- `newPassword`: 필수, 8~100자.
- 현재 비밀번호가 틀리거나 새 비밀번호가 현재 비밀번호와 같으면 `400 BAD_REQUEST`입니다.

**성공 `204 No Content`** — 응답 본문이 없습니다. 비밀번호를 변경하면 `tokenVersion`이 증가하므로 기존 JWT는 다시 로그인해야 사용할 수 있습니다.

### 3.6 회원 탈퇴

`DELETE /api/auth/me`

```json
{
  "password": "currentPassword123",
  "confirmationText": "탈퇴합니다"
}
```

- `password`: 필수, 최대 100자.
- `confirmationText`: 필수, 최대 20자이며 정확히 `탈퇴합니다`여야 합니다.
- 비밀번호가 틀리거나 확인 문구가 일치하지 않으면 `400 BAD_REQUEST`입니다.

**성공 `204 No Content`** — 응답 본문이 없습니다. 계정은 Soft Delete 처리되고 사용자 식별 정보 일부가 익명화되며, 기존 JWT는 무효화됩니다. 게시글/댓글과의 참조 관계 유지를 위해 사용자 행 자체를 단순 삭제하지 않습니다.

---

## 4. 게시판 API

### 4.1 목록 및 상세 조회

- `GET /api/boards` — `200 OK`, `BoardResponse[]`
- `GET /api/boards/{boardId}` — `200 OK`, `BoardResponse`; 대상이 없으면 404

응답 예시:

```json
{
  "id": 1,
  "name": "자유게시판",
  "description": "자유롭게 이야기하는 게시판"
}
```

### 4.2 게시판 생성 및 수정

- 생성: `POST /api/boards` — `ADMIN`, 성공 `201 Created`
- 수정: `PUT /api/boards/{boardId}` — `ADMIN`, 성공 `200 OK`

요청 본문:

```json
{
  "name": "질문게시판",
  "description": "개발 관련 질문을 올리는 게시판"
}
```

`name`은 필수, 공백 불가, 최대 100자입니다. `description`은 선택 항목이며 최대 255자입니다. 이름 중복은 `409 BOARD_NAME_ALREADY_EXISTS`, 대상 게시판 없음은 404입니다.

### 4.3 게시판 삭제

`DELETE /api/boards/{boardId}` — `ADMIN` 전용. 성공 `204 No Content`.

카테고리가 존재하면 `409 BOARD_HAS_CATEGORIES`, 게시글이 존재하면 `409 BOARD_HAS_POSTS`입니다. 삭제는 실제 삭제이며, 게시글 존재 확인 시 Soft Delete된 게시글도 별도로 제외하지 않습니다.

---

## 5. 카테고리 API

### 5.1 목록 및 상세 조회

- `GET /api/boards/{boardId}/categories` — `200 OK`, `CategoryResponse[]`
- `GET /api/categories/{categoryId}` — `200 OK`, `CategoryResponse`

응답 예시:

```json
{ "id": 3, "boardId": 1, "name": "Spring" }
```

없는 게시판/카테고리는 `404 RESOURCE_NOT_FOUND`입니다. 목록 응답에는 서비스가 명시한 정렬 기준이 없습니다.

### 5.2 카테고리 생성 및 수정

- 생성: `POST /api/boards/{boardId}/categories` — `ADMIN`, 성공 `201 Created`
- 수정: `PUT /api/categories/{categoryId}` — `ADMIN`, 성공 `200 OK`

```json
{ "name": "Spring" }
```

`name`은 필수, 공백 불가, 최대 100자입니다. 같은 게시판 안에서 이름이 중복되면 `409 CATEGORY_NAME_ALREADY_EXISTS`입니다.

### 5.3 카테고리 삭제

`DELETE /api/categories/{categoryId}` — `ADMIN` 전용. 성공 `204 No Content`. 카테고리가 게시글에서 참조되고 DB 제약조건이 삭제를 막으면 `409 DATA_INTEGRITY_VIOLATION`이 반환될 수 있습니다.

---

## 6. 게시글 API

### 6.1 게시글 목록·검색·페이지네이션

`GET /api/boards/{boardId}/posts`

| 쿼리 파라미터 | 타입 | 기본값 | 규칙 |
|---|---|---:|---|
| `page` | integer | `0` | 0 이상, 0부터 시작 |
| `size` | integer | `10` | 1~100 |
| `keyword` | string | 생략 | 제목 또는 본문에 포함되는 키워드; 앞뒤 공백 제거 |

예시:

```http
GET /api/boards/1/posts?page=0&size=10&keyword=스프링
Authorization: Bearer <JWT>
```

검색 대상은 Soft Delete되지 않은 게시글의 제목과 본문입니다. 검색 쿼리는 대소문자를 구분하지 않도록 구성되어 있습니다. 키워드가 없거나 공백뿐이면 일반 목록을 조회합니다. 정렬은 `createdAt DESC`, 동률이면 `id DESC`입니다.

**성공 `200 OK`** — `Page<PostListResponse>` 응답. 대표 구조:

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
      "createdAt": "2026-10-18T10:30:00"
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

실제 `Page` JSON에는 Spring Data 버전에 따라 `pageable`, `sort` 등의 메타데이터가 함께 포함될 수 있습니다.

오류: 게시판 없음 `404 RESOURCE_NOT_FOUND`, 음수 페이지 또는 크기 범위 위반 `400 BAD_REQUEST`, 숫자 변환 실패 `400 INVALID_PARAMETER`.

### 6.2 게시글 작성

`POST /api/boards/{boardId}/posts` — 로그인 필요, 성공 `201 Created`.

```json
{
  "title": "Spring Boot 질문",
  "content": "설정 방법을 알고 싶습니다.",
  "categoryId": 3
}
```

| 필드 | 필수 | 검증/동작 |
|---|---|---|
| `title` | 예 | 공백 불가, 최대 200자 |
| `content` | 예 | 공백 불가. DTO에 최대 길이 검증 없음 |
| `categoryId` | 아니요 | 지정하면 현재 게시판에 속한 카테고리여야 함 |

작성자는 JWT 인증 사용자로 결정됩니다. 성공 시 `PostResponse`를 반환하며 새 게시글의 조회수/좋아요 수는 0입니다. 카테고리 미지정은 `null`입니다. 다른 게시판의 카테고리를 지정하면 `409 INVALID_CATEGORY_BOARD`입니다.

### 6.3 게시글 상세 조회

`GET /api/posts/{postId}` — 성공 `200 OK`, `PostResponse` 반환.

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
  "createdAt": "2026-10-18T10:30:00",
  "updatedAt": "2026-10-18T10:45:00"
}
```

상세 조회 성공 시 조회수를 원자적 DB 업데이트로 1 증가시킨 뒤 최신 값을 응답합니다. 삭제되었거나 없는 게시글은 `404 RESOURCE_NOT_FOUND`입니다. 카테고리가 없으면 `categoryId`, `categoryName`은 null일 수 있습니다.

### 6.4 게시글 수정

`PUT /api/posts/{postId}` — 작성자 본인 또는 `ADMIN`, 성공 `200 OK`.

요청 본문은 게시글 작성과 같습니다. `categoryId`를 null로 지정하거나 생략하면 카테고리 연결을 해제합니다. 대상 없음은 404, 다른 게시판의 카테고리는 `409 INVALID_CATEGORY_BOARD`, 작성자 권한 위반은 `409 POST_ACCESS_DENIED`입니다.

### 6.5 게시글 삭제

`DELETE /api/posts/{postId}` — 작성자 본인 또는 `ADMIN`, 성공 `204 No Content`.

실제 행을 삭제하지 않고 `deletedAt`을 기록합니다. 삭제된 게시글은 일반 목록 및 상세 API에서 제외됩니다. 권한 위반은 `409 POST_ACCESS_DENIED`입니다.

---

## 7. 댓글 API

### 7.1 댓글 및 대댓글 목록

`GET /api/posts/{postId}/comments` — 성공 `200 OK`, `CommentListResponse[]`.

정렬은 `createdAt ASC`, 같은 시각이면 `id ASC`입니다. **삭제된 댓글은 목록에서 제거하지 않습니다.** 대댓글 연결을 유지하기 위해 삭제 댓글의 자리표시 데이터를 함께 반환합니다.

일반 댓글 예시:

```json
{
  "id": 21,
  "parentId": null,
  "authorId": 1,
  "authorNickname": "게시판유저",
  "content": "좋은 질문이네요.",
  "createdAt": "2026-10-18T12:00:00",
  "updatedAt": "2026-10-18T12:00:00",
  "deleted": false
}
```

삭제 댓글 자리표시 예시:

```json
{
  "id": 21,
  "parentId": null,
  "authorId": null,
  "authorNickname": "삭제된 댓글",
  "content": "삭제된 댓글입니다.",
  "createdAt": "2026-10-18T12:00:00",
  "updatedAt": "2026-10-18T12:15:00",
  "deleted": true
}
```

삭제 댓글은 `authorId`가 null이고 `deleted`가 true입니다. `parentId`는 보존되므로 해당 댓글의 대댓글을 연결할 수 있습니다. 게시글 자체가 삭제되었거나 없으면 404입니다.

### 7.2 댓글 또는 대댓글 작성

`POST /api/posts/{postId}/comments` — 로그인 필요, 성공 `201 Created`.

```json
{
  "content": "답변 감사합니다.",
  "parentId": null
}
```

- `content`: 필수, 공백 불가, 최대 1000자.
- `parentId`: 선택. null이면 일반 댓글, 값이 있으면 대댓글입니다.
- 대댓글의 부모 댓글은 존재해야 하고 삭제되지 않았어야 하며 같은 게시글에 속해야 합니다.

게시글/부모 댓글 없음은 404, 다른 게시글에 속한 부모 댓글은 `409 INVALID_PARENT_COMMENT`, DTO 검증 실패는 `400 VALIDATION_FAILED`입니다.

### 7.3 댓글 상세 조회

`GET /api/comments/{commentId}` — 성공 `200 OK`, `CommentResponse` 반환.

```json
{
  "id": 21,
  "postId": 12,
  "parentId": null,
  "authorId": 1,
  "authorNickname": "게시판유저",
  "content": "답변 감사합니다.",
  "createdAt": "2026-10-18T12:00:00",
  "updatedAt": "2026-10-18T12:00:00"
}
```

삭제된 댓글은 상세 조회 대상에서 제외되므로 404입니다. 삭제 플래그를 포함한 자리표시가 필요한 경우 게시글 댓글 목록 API를 사용합니다.

### 7.4 댓글 수정 및 삭제

- 수정: `PUT /api/comments/{commentId}` — 작성자 본인 또는 `ADMIN`, 성공 `200 OK`
- 삭제: `DELETE /api/comments/{commentId}` — 작성자 본인 또는 `ADMIN`, 성공 `204 No Content`

수정 요청:

```json
{ "content": "수정한 댓글입니다." }
```

`content`는 공백 불가, 최대 1000자입니다. 삭제는 Soft Delete이며, 실제 삭제 대신 `deletedAt`을 기록합니다. 권한 위반은 `409 COMMENT_ACCESS_DENIED`입니다.

---

## 8. 좋아요 API

### 8.1 좋아요 상태 조회

`GET /api/posts/{postId}/likes` — 성공 `200 OK`.

```json
{ "postId": 12, "likeCount": 2, "likedByMe": true }
```

### 8.2 좋아요 등록

`POST /api/posts/{postId}/likes` — 본문 없음, 성공 `201 Created`.

응답은 `postId`, 갱신된 `likeCount`, `likedByMe: true`를 포함합니다. 이미 좋아요한 게시글이면 `409 POST_LIKE_ALREADY_EXISTS`입니다.

### 8.3 좋아요 취소

`DELETE /api/posts/{postId}/likes` — 본문 없음, 성공 `200 OK`.

응답은 `postId`, 갱신된 `likeCount`, `likedByMe: false`를 포함합니다. 해당 사용자의 좋아요 기록이 없으면 `404 RESOURCE_NOT_FOUND`입니다.

세 API 모두 존재하고 삭제되지 않은 게시글을 대상으로 하며, 로그인 사용자의 상태를 기준으로 처리합니다.

---

## 9. 첨부파일 API

### 9.1 목록 조회

`GET /api/posts/{postId}/attachments` — 성공 `200 OK`, `AttachmentResponse[]`.

응답 예시:

```json
[
  {
    "id": 7,
    "postId": 12,
    "originalName": "example.pdf",
    "fileSize": 245760,
    "contentType": "application/pdf",
    "createdAt": "2026-10-18T13:00:00",
    "downloadUrl": "/api/attachments/7/download"
  }
]
```

목록은 `createdAt ASC`로 정렬됩니다. 게시글이 존재하고 삭제되지 않아야 합니다. 목록 조회는 로그인 사용자에게 허용되며 작성자 여부는 별도로 검사하지 않습니다.

### 9.2 업로드

`POST /api/posts/{postId}/attachments` — `multipart/form-data`, 성공 `201 Created`.

- 폼 필드 이름: `file`
- 허용 최대 크기: 10 MiB(10 × 1024 × 1024 bytes)
- 권한: 게시글 작성자 또는 `ADMIN`
- 성공 응답: 업로드한 `AttachmentResponse`; `Location` 헤더에는 다운로드 경로가 지정됩니다.

`curl` 예시:

```bash
curl -X POST "http://localhost:8080/api/posts/12/attachments" \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@./example.pdf"
```

파일이 비어 있거나 유효하지 않으면 400 계열 오류, 크기 제한을 초과하면 `413 FILE_TOO_LARGE`가 될 수 있습니다. 게시글 권한 위반은 서비스 비즈니스 오류로 처리됩니다.

### 9.3 다운로드

`GET /api/attachments/{attachmentId}/download` — 성공 `200 OK`, 파일 바이너리.

응답은 `application/octet-stream`, `Content-Disposition: attachment` 헤더를 사용하며 원본 파일명은 UTF-8로 지정됩니다. 로그인은 필요하지만, 파일을 업로드한 게시글의 작성자인지는 별도 검사하지 않습니다. 존재하지 않는 첨부파일은 404입니다.

### 9.4 삭제

`DELETE /api/attachments/{attachmentId}` — 게시글 작성자 또는 `ADMIN`, 성공 `204 No Content`.

파일과 DB 메타데이터를 삭제합니다. 게시글 권한 위반과 저장소 오류는 서비스 예외 처리 결과를 따릅니다.

### 9.5 파일 저장 설정

업로드 경로는 `app.upload.dir` 설정을 사용합니다. 설정하지 않으면 `${user.home}/board-project-uploads`가 기본값입니다. 배포 시 컨테이너 외부 영속 볼륨과 백업을 고려해야 합니다.

---

## 10. 내 활동 API

두 API 모두 로그인한 사용자 본인 데이터만 반환합니다. 기본 페이지는 0, 기본 크기는 10이며 `size`는 1~100입니다. 정렬은 `createdAt DESC`, 동률이면 `id DESC`입니다. `keyword`는 선택 사항이며 앞뒤 공백을 제거하고, 빈 문자열은 검색어 없음으로 처리합니다. 검색어는 최대 200자입니다.

### 10.1 내가 작성한 게시글

`GET /api/me/posts?page=0&size=10&keyword=스프링`

**성공 `200 OK`** — `Page<MyPostResponse>`.

대표 항목 필드: `id`, `boardId`, `boardName`, `categoryName`, `title`, `viewCount`, `likeCount`, `createdAt`, `updatedAt`.

삭제되지 않은 본인 게시글만 반환됩니다.

### 10.2 내가 작성한 댓글

`GET /api/me/comments?page=0&size=10&keyword=답변`

**성공 `200 OK`** — `Page<MyCommentResponse>`.

대표 항목 필드: `id`, `postId`, `parentId`, `postTitle`, `boardId`, `boardName`, `categoryName`, `content`, `createdAt`, `updatedAt`.

삭제되지 않은 본인 댓글이며, 게시글도 삭제되지 않은 경우만 반환됩니다. 페이지 범위 오류는 400입니다.

---

## 11. 관리자 회원 API

### 11.1 회원 목록

`GET /api/admin/users`

**의도된 접근 권한:** `ADMIN`.

**성공 `200 OK`** — `AdminUserResponse[]` 배열입니다. 현재 구현은 페이지네이션 없이 전체 사용자 목록을 `createdAt DESC`로 반환합니다. `deletedAt`이 있는 탈퇴 계정도 목록에 포함될 수 있습니다.

응답 항목 필드:

```json
{
  "userId": 1,
  "username": "boarduser01",
  "nickname": "게시판유저",
  "email": "user@example.com",
  "role": "USER",
  "createdAt": "2026-10-18T10:00:00",
  "updatedAt": "2026-10-18T10:00:00",
  "deletedAt": null
}
```

비밀번호 해시와 토큰 내부 값은 반환하지 않습니다. **현재 관리자 권한 검사의 HTTP 오류 응답은 14절을 참고하세요.**

---

## 12. 공통 오류 응답

일반적인 오류 본문 형식은 다음과 같습니다.

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "요청한 리소스를 찾을 수 없습니다."
}
```

| HTTP | 코드 예시 | 발생 조건 |
|---:|---|---|
| 400 | `VALIDATION_FAILED` | DTO 필드 검증 실패 |
| 400 | `INVALID_REQUEST_BODY` | JSON 본문 파싱 실패 |
| 400 | `INVALID_PARAMETER` | path/query 파라미터의 타입 변환 실패 또는 필수 파라미터 누락 |
| 400 | `BAD_REQUEST` | 페이지 값 범위 등 `ResponseStatusException` 기반 잘못된 요청 |
| 401 | `UNAUTHORIZED` | 보호 API 인증 누락 또는 유효하지 않은 인증 |
| 401 | `INVALID_CREDENTIALS` | 로그인 정보 오류 또는 탈퇴 계정 로그인 |
| 403 | `FORBIDDEN` | Spring Security 필터 체인에서 권한 거부 |
| 404 | `RESOURCE_NOT_FOUND` | 대상 게시판·카테고리·게시글·댓글·첨부파일·사용자 없음 |
| 409 | 비즈니스별 코드 | 중복 데이터, 게시글/댓글 권한 규칙 등 비즈니스 충돌 |
| 409 | `DATA_INTEGRITY_VIOLATION` | DB 유일성/참조 제약 위반 |
| 413 | `FILE_TOO_LARGE` | Multipart 업로드 최대 크기 초과 |
| 500 | `INTERNAL_SERVER_ERROR` | 처리되지 않은 서버 오류 |

`BusinessException`은 현재 `409 Conflict`로 매핑됩니다. 작성자 권한 위반도 이 예외를 사용하므로 게시글·댓글 등의 권한 오류가 403이 아니라 409로 반환됩니다. 보안 필터 체인에서 발생하는 인증/권한 오류와 서비스 예외는 처리 경로가 서로 다릅니다.

주요 비즈니스 코드 예시:

| 코드 | 의미 |
|---|---|
| `USERNAME_ALREADY_EXISTS` | username 중복 |
| `NICKNAME_ALREADY_EXISTS` | nickname 중복 |
| `EMAIL_ALREADY_EXISTS` | email 중복 |
| `BOARD_NAME_ALREADY_EXISTS` | 게시판 이름 중복 |
| `BOARD_HAS_CATEGORIES` | 카테고리가 있어 게시판 삭제 불가 |
| `BOARD_HAS_POSTS` | 게시글이 있어 게시판 삭제 불가 |
| `CATEGORY_NAME_ALREADY_EXISTS` | 같은 게시판 내 카테고리 이름 중복 |
| `INVALID_CATEGORY_BOARD` | 게시글과 카테고리의 게시판 불일치 |
| `POST_ACCESS_DENIED` | 게시글 작성 권한 위반 |
| `COMMENT_ACCESS_DENIED` | 댓글 작성 권한 위반 |
| `INVALID_PARENT_COMMENT` | 대댓글 부모가 다른 게시글에 속함 |
| `POST_LIKE_ALREADY_EXISTS` | 중복 좋아요 |

---

## 13. DTO 요약

| DTO/응답 | 주요 필드 |
|---|---|
| `LoginResponse` | `accessToken`, `userId`, `username`, `nickname`, `role` |
| `ProfileResponse` | `userId`, `username`, `nickname`, `email`, `role`, `createdAt`, `updatedAt` |
| `BoardResponse` | `id`, `name`, `description` |
| `CategoryResponse` | `id`, `boardId`, `name` |
| `PostListResponse` | `id`, `categoryId`, `categoryName`, `authorNickname`, `title`, `viewCount`, `likeCount`, `createdAt` |
| `PostResponse` | `id`, `boardId`, `categoryId`, `categoryName`, `authorId`, `authorNickname`, `title`, `content`, `viewCount`, `likeCount`, `createdAt`, `updatedAt` |
| `CommentListResponse` | `id`, `parentId`, `authorId`, `authorNickname`, `content`, `createdAt`, `updatedAt`, `deleted` |
| `CommentResponse` | `id`, `postId`, `parentId`, `authorId`, `authorNickname`, `content`, `createdAt`, `updatedAt` |
| `PostLikeResponse` | `postId`, `likeCount`, `likedByMe` |
| `AttachmentResponse` | `id`, `postId`, `originalName`, `fileSize`, `contentType`, `createdAt`, `downloadUrl` |
| `MyPostResponse` | `id`, `boardId`, `boardName`, `categoryName`, `title`, `viewCount`, `likeCount`, `createdAt`, `updatedAt` |
| `MyCommentResponse` | `id`, `postId`, `parentId`, `postTitle`, `boardId`, `boardName`, `categoryName`, `content`, `createdAt`, `updatedAt` |
| `AdminUserResponse` | `userId`, `username`, `nickname`, `email`, `role`, `createdAt`, `updatedAt`, `deletedAt` |

---

## 14. 구현상 확인 사항

1. **관리자 회원 API 권한 응답 확인 필요:** `SecurityConfig`에는 `/api/admin/**`에 대한 명시적 URL 권한 규칙이 없습니다. `AdminUserController`는 `@PreAuthorize("hasRole('ADMIN')")`와 메서드 안의 역할 검사를 함께 사용하지만, 현재 확인한 `SecurityConfig`에는 `@EnableMethodSecurity`가 없습니다. 내부 검사에서 `AccessDeniedException`이 발생할 경우 전역의 일반 `Exception` 핸들러가 이를 500으로 처리할 가능성이 있습니다. `/api/admin/**`에 URL 수준 `hasRole("ADMIN")`을 적용하고 일반 사용자 403 / 관리자 200 통합 테스트로 확인하는 것이 좋습니다.
2. **서비스 권한 오류의 상태 코드:** 게시글·댓글·첨부파일 서비스의 작성자 검사에서 `BusinessException`을 쓰는 경우 409가 반환됩니다. API 클라이언트가 모든 권한 오류를 403으로 가정하지 않도록 주의해야 합니다.
3. **첨부파일 다운로드 권한:** 다운로드는 인증 필요지만 파일 업로더 또는 게시글 작성자 여부를 별도 검사하지 않습니다. 제품 요구사항상 비공개 파일이어야 한다면 권한 정책을 재검토해야 합니다.
4. **관리자 회원 목록 페이지네이션:** 현재 전체 목록을 한 번에 반환합니다. 회원 수가 커질 경우 서버 페이지네이션이 필요합니다.
5. **Soft Delete 표현:** 게시글과 댓글의 실제 행은 유지됩니다. 댓글 목록은 삭제 댓글을 `deleted: true` 자리표시로 반환하지만 댓글 상세 API는 삭제된 댓글에 404를 반환합니다.
6. **페이지 직렬화:** 게시글 목록 및 내 활동 API는 Spring Data `Page`를 직접 반환하므로 실제 프런트엔드가 사용하는 필드와 라이브 응답 구조가 일치하는지 회귀 확인하는 것이 좋습니다.
7. **테스트 범위:** 이 문서는 `main`의 소스 코드를 기준으로 정리했습니다. 문서 작성 과정에서 외부 HTTP 호출이나 전체 자동화 테스트를 새로 실행한 것은 아닙니다.
