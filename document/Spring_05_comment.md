# Board Project Backend - Comment 완료 문서

## 1. 프로젝트 개요

Spring Boot 기반 게시판 백엔드 프로젝트.

- Java 21
- Spring Boot 4.1.1
- Spring Data JPA
- MariaDB
- Flyway
- Spring Security + JWT
- Bean Validation
- JJWT 0.13.0

프로젝트 구조:

```text
Board_Project/
├── db/
├── back/
├── front/
├── .github/
└── README.md / PROJECT_PLAN.md
```

---

## 2. DB 및 Flyway 상태

MariaDB:

- Host: localhost
- Port: 3307
- Database: board_db
- Username: root

Flyway migration:

```text
V1__create_users.sql
V2__create_boards.sql
V3__create_categories.sql
V4__create_posts.sql
V5__create_comments.sql
V6__create_post_likes.sql
V7__create_attachments.sql
```

현재 Flyway 1~7 migration이 정상 적용되어 있으며 JPA `ddl-auto=validate` 기준으로 스키마 검증도 통과한 상태.

주요 테이블:

```text
users
boards
categories
posts
comments
post_likes
attachments
flyway_schema_history
```

---

## 3. 인증 및 보안

JWT 기반 Stateless 인증 적용.

주요 흐름:

```text
로그인
  ↓
username/password 검증
  ↓
JWT 발급
  ↓
Authorization: Bearer <JWT>
  ↓
JwtAuthenticationFilter
  ↓
사용자 조회
  ↓
SecurityContext 인증 등록
  ↓
Controller / Service
```

권한:

```text
USER
ADMIN
```

Spring Security 권한:

```text
ROLE_USER
ROLE_ADMIN
```

게시판/카테고리 생성, 수정, 삭제는 ADMIN 권한으로 제한.

인증이 필요한 API에 JWT가 없는 경우 401 응답.

---

# 4. Board

Board CRUD 구현 및 테스트 완료.

```text
GET    /api/boards
GET    /api/boards/{boardId}
POST   /api/boards
PUT    /api/boards/{boardId}
DELETE /api/boards/{boardId}
```

테스트:

```text
목록 조회                 ✅
상세 조회                 ✅
존재하지 않는 Board       ✅ 404
ADMIN 생성                ✅ 201
USER 생성 차단            ✅ 403
JWT 없는 요청             ✅ 401
중복 이름                 ✅ 409
Validation 오류           ✅ 400
ADMIN 수정                ✅ 200
ADMIN 삭제                ✅ 204
Soft Delete 이후 조회     ✅ 404
```

---

# 5. Category

Category CRUD 구현 및 테스트 완료.

```text
GET    /api/boards/{boardId}/categories
POST   /api/boards/{boardId}/categories
PUT    /api/categories/{categoryId}
DELETE /api/categories/{categoryId}
```

Repository에서 다음 검증을 사용:

```java
List<Category> findByBoardId(Long boardId);

boolean existsByBoardId(Long boardId);

boolean existsByBoardIdAndName(Long boardId, String name);

boolean existsByBoardIdAndNameAndIdNot(
        Long boardId,
        String name,
        Long categoryId
);
```

테스트 완료:

```text
목록 조회                 ✅
생성                      ✅
수정                      ✅
삭제                      ✅
중복 이름                 ✅ 409
권한 검증                 ✅
인증 검증                 ✅
Validation 검증           ✅
```

---

# 6. Post

Post CRUD 및 게시판 핵심 기능 구현 완료.

API:

```text
GET    /api/boards/{boardId}/posts
GET    /api/posts/{postId}
POST   /api/boards/{boardId}/posts
PUT    /api/posts/{postId}
DELETE /api/posts/{postId}
```

Post DTO:

```text
dto/post/
├── PostCreateRequest.java
├── PostUpdateRequest.java
├── PostResponse.java
└── PostListResponse.java
```

주요 필드:

```text
title
content
categoryId
viewCount
likeCount
createdAt
updatedAt
```

게시글 작성 시 Category가 지정되면 해당 Category가 같은 Board에 속하는지 검사.

잘못된 Board의 Category 지정:

```text
409
INVALID_CATEGORY_BOARD
```

작성자 또는 ADMIN만 수정/삭제 가능.

작성자가 아닌 USER가 수정/삭제 시:

```text
409
POST_ACCESS_DENIED
```

삭제는 Soft Delete 방식:

```text
deleted_at = 현재 시간
```

따라서 실제 DB row는 유지되고 일반 조회에서는 삭제된 게시글을 제외.

조회수:

```text
게시글 상세 조회 시 viewCount + 1
```

테스트 완료:

```text
게시글 생성                    ✅ 201
게시글 목록                    ✅ 200
존재하지 않는 Board             ✅ 404
게시글 상세                    ✅ 200
조회수 증가                    ✅ 0 → 1 → 2
존재하지 않는 Post              ✅ 404
Category 지정                  ✅
다른 Board의 Category           ✅ 409
작성자 수정                    ✅ 200
다른 USER 수정 차단             ✅
ADMIN 수정                     ✅ 200
작성자 삭제                    ✅
다른 USER 삭제 차단              ✅
ADMIN 삭제                     ✅
Soft Delete                    ✅
삭제된 게시글 상세 조회 차단      ✅ 404
삭제된 게시글 목록 제외           ✅
Validation 오류                ✅ 400
제목 200자 초과 차단              ✅ 400
JWT 없는 요청                   ✅ 401
```

---

# 7. Comment

댓글 CRUD 및 대댓글 기능 구현 완료.

Entity:

```text
Comment
├── id
├── post
├── user
├── parent
├── content
├── createdAt
├── updatedAt
└── deletedAt
```

API:

```text
GET    /api/posts/{postId}/comments
GET    /api/comments/{commentId}
POST   /api/posts/{postId}/comments
PUT    /api/comments/{commentId}
DELETE /api/comments/{commentId}
```

DTO:

```text
dto/comment/
├── CommentCreateRequest.java
├── CommentUpdateRequest.java
├── CommentResponse.java
└── CommentListResponse.java
```

생성:

```text
content
parentId (optional)
```

수정에서는 parentId를 변경하지 않도록 설계.

댓글 작성자는 본인의 댓글을 수정/삭제할 수 있고 ADMIN은 모든 댓글을 수정/삭제할 수 있음.

삭제는 Soft Delete:

```text
deleted_at = 현재 시간
```

댓글 목록에서는 삭제된 댓글을 제외.

---

## 7-1. 대댓글

`parentId`를 이용해 부모 댓글 지정.

검증:

```text
parentId == null
    → 일반 댓글

parentId 존재
    ↓
부모 댓글 존재 여부 확인
    ↓
부모 댓글이 같은 Post인지 확인
```

존재하지 않는 parent:

```text
404
RESOURCE_NOT_FOUND
```

다른 Post의 댓글을 parent로 지정:

```text
409
INVALID_PARENT_COMMENT
```

현재 구현은 같은 Post라면 댓글을 여러 단계로 중첩할 수 있는 구조.

예:

```text
댓글
 └─ 대댓글
     └─ 대댓글
         └─ 대댓글
```

프로젝트 요구사항에서 1단계 대댓글만 허용하기로 결정할 경우 추후 제한 로직을 추가할 수 있음.

---

## 7-2. Comment 테스트 결과

```text
일반 댓글 생성                 ✅
댓글 목록 조회                 ✅
댓글 상세 조회                 ✅
대댓글 생성                    ✅
존재하지 않는 parent            ✅ 404
다른 Post의 parent              ✅ 409
댓글 작성자 수정               ✅
다른 USER 수정 차단             ✅
ADMIN 수정                     ✅
인증 없는 수정                  ✅ 401
댓글 작성자 삭제               ✅
다른 USER 삭제 차단             ✅
ADMIN 삭제                     ✅
Soft Delete                    ✅
삭제된 댓글 목록 제외            ✅
빈 댓글 차단                    ✅ 400
1000자 초과 댓글 차단             ✅ 400
JWT 없는 댓글 생성              ✅ 401
JWT 없는 댓글 조회              ✅ 401
```

---

# 8. 현재 백엔드 진행 상황

```text
User / Auth          ✅
JWT / Security       ✅
Board CRUD           ✅
Category CRUD        ✅
Post CRUD            ✅
Comment CRUD         ✅

PostLike             ⬜ 다음 작업
Attachment           ⬜
공통 예외/보안 정리    ⬜
페이징                ⬜
검색                  ⬜
관리자 기능 보완       ⬜
통합 테스트            ⬜

React Frontend        ⬜
Docker                ⬜
GitHub Actions        ⬜
배포                  ⬜
```

---

# 9. 다음 작업 - PostLike

`post_likes` 테이블 구조:

```text
post_likes
├── id
├── post_id
├── user_id
└── created_at
```

중복 좋아요 방지:

```text
UNIQUE(post_id, user_id)
```

좋아요는 수정되는 데이터가 아니므로 `updated_at`이 필요하지 않음.

구현 예정 API:

```text
GET    /api/posts/{postId}/likes
POST   /api/posts/{postId}/likes
DELETE /api/posts/{postId}/likes
```

예상 응답:

```json
{
  "postId": 1,
  "likeCount": 5,
  "likedByMe": true
}
```

주요 처리:

### 좋아요 등록

```text
Post 존재 확인
    ↓
User 확인
    ↓
이미 좋아요 했는지 확인
    ↓
PostLike 저장
    ↓
Post.likeCount + 1
```

### 좋아요 취소

```text
Post 존재 확인
    ↓
현재 User의 좋아요 확인
    ↓
PostLike 삭제
    ↓
Post.likeCount - 1
```

### 좋아요 조회

```text
Post 존재 확인
    ↓
likeCount 조회
    ↓
현재 User의 좋아요 여부 확인
```

테스트 예정:

```text
좋아요 등록                 ⬜
중복 좋아요 차단             ⬜
좋아요 수 증가               ⬜
좋아요 상태 조회             ⬜
좋아요 취소                  ⬜
좋아요 수 감소               ⬜
여러 USER의 좋아요           ⬜
존재하지 않는 Post            ⬜ 404
삭제된 Post                  ⬜
JWT 없는 요청                ⬜ 401
DB like_count 검증           ⬜
```

---

# 10. 현재 구현 원칙

이번 프로젝트는 다음 원칙으로 개발 진행.

```text
DB 설계
  ↓
Entity
  ↓
Repository
  ↓
DTO
  ↓
Service
  ↓
Controller
  ↓
Security / 권한
  ↓
Postman 테스트
  ↓
DB 직접 검증
  ↓
Markdown 문서화
  ↓
다음 기능
```

기능을 하나씩 완성하고 HTTP 응답뿐 아니라 MariaDB의 실제 데이터도 확인하는 방식으로 진행한다.
