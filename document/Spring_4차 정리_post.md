# Board Project Backend 진행 문서 — Post 완료

## 1. 현재 프로젝트 구조

```text
Board_Project/
├── db/          # DB 설계 / Flyway Migration / 문서
├── back/        # Spring Boot 백엔드
├── front/       # React 프론트엔드
├── .github/
└── README.md
```

환경:
- Java 21
- Spring Boot 4.1.1
- Spring Data JPA
- Spring Security
- JWT
- MariaDB 10.6.x
- Flyway
- Maven
- MariaDB 포트: 3307
- Spring Boot 포트: 8080
- DB: board_db

## 2. DB / Flyway

V1~V7 migration 적용 완료.

```text
V1__create_users.sql
V2__create_boards.sql
V3__create_categories.sql
V4__create_posts.sql
V5__create_comments.sql
V6__create_post_likes.sql
V7__create_attachments.sql
```

현재 schema version: 7

실행 시 `Unknown system variable 'WSREP_ON'` 경고가 보이지만 migration은 정상 검증되고 애플리케이션도 정상 기동한다.

## 3. 인증 / 인가

회원가입:
- 정상 가입 ✅
- validation ✅
- username/nickname/email 중복 검증 ✅
- BCrypt 암호화 ✅

로그인:
- 정상 로그인 ✅
- 잘못된 비밀번호 → 401 ✅
- 존재하지 않는 사용자 → 401 ✅
- validation ✅

JWT:
- 발급 ✅
- 검증 ✅
- Bearer Token 처리 ✅
- SecurityContext 등록 ✅
- /api/auth/me ✅
- 잘못된/없는 JWT → 401 ✅

Role:
```text
USER → ROLE_USER
ADMIN → ROLE_ADMIN
```

## 4. Board

API:
```text
GET    /api/boards
GET    /api/boards/{boardId}
POST   /api/boards
PUT    /api/boards/{boardId}
DELETE /api/boards/{boardId}
```

권한:
- 조회: 인증 사용자
- 생성: ADMIN
- 수정: ADMIN
- 삭제: ADMIN

CRUD, validation, 중복, 401/403/404/409 테스트 완료.

## 5. Category

API:
```text
GET    /api/boards/{boardId}/categories
POST   /api/boards/{boardId}/categories
GET    /api/categories/{categoryId}
PUT    /api/categories/{categoryId}
DELETE /api/categories/{categoryId}
```

권한:
- 조회: 인증 사용자
- 생성/수정/삭제: ADMIN

CRUD 및 validation/권한 테스트 완료.

CategoryRepository 주요 메서드:
```java
List<Category> findByBoardId(Long boardId);
boolean existsByBoardId(Long boardId);
boolean existsByBoardIdAndName(Long boardId, String name);
boolean existsByBoardIdAndNameAndIdNot(Long boardId, String name, Long categoryId);
```

## 6. Post

### 6.1 Entity

```text
Post
├── id
├── board
├── category
├── user
├── title
├── content
├── viewCount
├── likeCount
└── deletedAt
```

주요 설정:
```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "board_id", nullable = false)
private Board board;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "category_id")
private Category category;

@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "user_id", nullable = false)
private User user;

@Column(name = "title", nullable = false, length = 200)
private String title;

@Column(name = "content", nullable = false, length = Length.LONG32)
private String content;

@Column(name = "view_count", nullable = false)
private Integer viewCount = 0;

@Column(name = "like_count", nullable = false)
private Integer likeCount = 0;

@Column(name = "deleted_at")
private LocalDateTime deletedAt;

public Post() {
}
```

### 6.2 Repository

```java
boolean existsByBoardId(Long boardId);

List<Post> findByBoardIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long boardId);

Optional<Post> findByIdAndDeletedAtIsNull(Long postId);
```

### 6.3 DTO

```text
dto/post/
├── PostCreateRequest.java
├── PostUpdateRequest.java
├── PostResponse.java
└── PostListResponse.java
```

Create/Update:
```text
title
content
categoryId
```

제목 제한:
```java
@NotBlank
@Size(max = 200)
```

PostResponse:
```text
id
boardId
categoryId
categoryName
authorId
authorNickname
title
content
viewCount
likeCount
createdAt
updatedAt
```

PostListResponse:
```text
id
categoryId
categoryName
authorNickname
title
viewCount
likeCount
createdAt
```

### 6.4 Service

주요 기능:
```text
findByBoardId()
findById()
create()
update()
delete()
```

게시글 작성:
- Board 존재 확인
- User 존재 확인
- categoryId가 없으면 허용
- categoryId가 있으면 Category 존재 확인
- Category가 요청 Board에 속하는지 검증
- Post 저장

상세 조회:
- 조회수 +1

수정:
- 작성자 본인 또는 ADMIN
- Category ↔ Board 관계 검증

삭제:
- Soft Delete
- `deletedAt = LocalDateTime.now()`

### 6.5 Controller

```text
GET    /api/boards/{boardId}/posts
GET    /api/posts/{postId}
POST   /api/boards/{boardId}/posts
PUT    /api/posts/{postId}
DELETE /api/posts/{postId}
```

JWT의 `authentication.getName()`으로 현재 username을 받고 ADMIN 여부도 Service에 전달한다.

## 7. Post 테스트 결과

### 생성
- 기본 생성 → 201 ✅
- DB 저장 확인 ✅
- Category 지정 생성 → 201 ✅

### 조회
- 게시글 목록 → 200 ✅
- 존재하지 않는 Board → 404 ✅
- 상세 조회 → 200 ✅
- createdAt / updatedAt 반환 ✅
- 조회수 증가: 0 → 1 → 2 ✅
- 존재하지 않는 Post → 404 ✅

### 무결성
- 다른 Board의 Category 사용 → 409 ✅
- code: INVALID_CATEGORY_BOARD ✅

### 수정
- 작성자 본인 → 200 ✅
- 다른 USER → 409 / POST_ACCESS_DENIED ✅
- ADMIN이 타 사용자 게시글 수정 → 200 ✅
- createdAt 유지 / updatedAt 갱신 ✅

### 삭제
- 작성자 USER 삭제 → 204 ✅
- 다른 USER 삭제 → 409 / POST_ACCESS_DENIED ✅
- ADMIN 삭제 → 204 ✅
- Soft Delete 확인 ✅
- 삭제된 게시글 상세 → 404 ✅
- 삭제된 게시글 목록에서 제외 ✅

### Validation
- 필수값 → 400 ✅
- 제목 200자 초과 → 400 ✅

초기에는 제목 200자 초과 시 DB의 `Data too long for column 'title'`가 발생해 500이 되었지만, `PostCreateRequest`와 `PostUpdateRequest`의 `@Size(max = 200)` 검증을 적용한 후 DB INSERT 전에 차단되어 400으로 정상 처리된다.

### 인증
- JWT 없는 Post API → 401 ✅

## 8. 현재 진행 상황

```text
DB 설계 / Migration        ✅
Spring Boot 초기 설정      ✅
JPA / Entity               ✅
Repository                 ✅
Exception 처리             ✅
회원가입                    ✅
로그인                      ✅
JWT                         ✅
Security                    ✅
Board CRUD                 ✅
Category CRUD               ✅
Post CRUD                  ✅
Post 권한                   ✅
Post Validation             ✅
Post Soft Delete            ✅

Comment                     ⏳
Post Like                   ⏳
Attachment                  ⏳
Pagination                  ⏳
Search                      ⏳
React Frontend              ⏳
Docker                      ⏳
GitHub Actions CI/CD        ⏳
```

## 9. 다음 작업 — Comment

Comment Entity는 이미 존재한다.

구조:
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

대댓글(parentId)이 있으므로 다음 검증이 추가된다.

```text
댓글 작성
├─ Post 존재
└─ User 확인

대댓글 작성
├─ Post 존재
├─ parent 댓글 존재
├─ parent 댓글이 같은 Post 소속인지 확인
└─ 삭제된 parent 사용 차단

댓글 수정
├─ 작성자 본인
└─ ADMIN

댓글 삭제
├─ 작성자 본인
└─ ADMIN + Soft Delete
```

예:
```text
Post 1
├── Comment 10
│   ├── Reply 11
│   └── Reply 12
└── Comment 13
```

다음 구현 순서:
```text
CommentRepository
→ Comment DTO
→ CommentService
→ CommentController
→ Postman 테스트
```
