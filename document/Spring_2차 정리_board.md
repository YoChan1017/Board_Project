# Board Project Backend 2차 정리

> 기준 범위: **DB 설계 → Spring Boot 기본 구성 → 회원/인증 → Board 기능까지**
>
> 목적: 이후 Post/Comment/Like/Attachment 개발을 진행할 때 지금까지의 설계와 구현 기준을 다시 확인할 수 있도록 정리한다.

---

## 1. 프로젝트 목표

이 프로젝트는 **MariaDB + Spring Boot + React** 기반의 실전형 게시판 서비스 구축을 목표로 한다.

단순 CRUD 구현만을 목표로 하지 않고 다음 개발 흐름을 경험한다.

- 요구사항 및 DB 설계
- REST API 설계
- Spring Boot Backend 구현
- Spring Data JPA / Hibernate
- Flyway DB Migration
- Spring Security / JWT 인증·인가
- 게시글 / 댓글 / 좋아요 / 첨부파일
- 테스트 및 Postman API 검증
- React Frontend 연동
- Docker
- GitHub Actions CI/CD

---

## 2. 전체 Repository 구조

```text
Board_Project/
├── db/                  # DB 설계 / 요구사항 / ERD / Migration 문서
├── back/                # Spring Boot Backend
├── front/               # React Frontend
├── .github/             # GitHub Actions
├── README.md
└── PROJECT_PLAN.md
```

하나의 GitHub Repository에서 관리하는 **Monorepo** 구조를 사용한다.

DB / Backend / Frontend를 별도 브랜치로 나누지 않고 기능 단위의 Feature Branch를 사용한다.

예:

```text
main
├── feature/auth
├── feature/board
├── feature/post
├── feature/comment
└── feature/...
```

---

## 3. 개발 환경

| 항목 | 구성 |
|---|---|
| IDE | Spring Tool Suite 4 (STS4) |
| Java | 21 |
| Spring Boot | 4.1.1 |
| Build | Maven |
| Database | MariaDB 10.6.x |
| DB Port | 3307 |
| Database | `board_db` |
| ORM | Spring Data JPA / Hibernate |
| Migration | Flyway |
| Security | Spring Security |
| Password Hash | BCrypt |
| JWT | JJWT 0.13.0 |

DB 접속 정보와 JWT Secret은 STS Run Configuration의 Environment Variables로 관리한다.

```text
DB_HOST=localhost
DB_PORT=3307
DB_NAME=board_db
DB_USERNAME=root
DB_PASSWORD=<실제 비밀번호>
JWT_SECRET=<Base64 Secret>
JWT_EXPIRATION_MS=3600000
```

실제 비밀번호 및 Secret은 Git에 저장하지 않는다.

---

## 4. DB 설계

현재 설계의 핵심 테이블은 다음과 같다.

```text
users
boards
categories
posts
comments
post_likes
attachments
```

### 주요 관계

```text
User
 └─ Post

Board
 ├─ Category
 └─ Post

Post
 ├─ Comment
 ├─ PostLike
 └─ Attachment

Comment
 └─ parent Comment
```

### 주요 삭제 정책

- `categories.board_id` → `ON DELETE RESTRICT`
- `posts.board_id` → `ON DELETE RESTRICT`
- `posts.category_id` → `ON DELETE SET NULL`

즉, 게시판에 카테고리나 게시글이 존재하면 게시판 삭제를 제한하고, 카테고리가 삭제되는 경우 게시글의 `category_id`는 NULL이 될 수 있도록 설계했다.

---

## 5. Flyway Migration

DB 스키마는 Flyway로 관리한다.

```text
V1__create_users.sql
V2__create_boards.sql
V3__create_categories.sql
V4__create_posts.sql
V5__create_comments.sql
V6__create_post_likes.sql
V7__create_attachments.sql
```

현재 7개 Migration이 정상적으로 적용되어 있다.

```text
Schema version: 7
Status: Up to date
```

DB 자체를 Git으로 관리하지 않고, 스키마 변경 사항을 Migration SQL로 관리한다.

---

## 6. Entity 설계 기준

패키지:

```text
com.example.board.entity
```

구성:

```text
BaseEntity.java
User.java
Board.java
Category.java
Post.java
Comment.java
PostLike.java
Attachment.java
```

### BaseEntity

`created_at`, `updated_at`을 공통 관리한다.

Spring Data JPA Auditing을 사용하며 `@EnableJpaAuditing`이 활성화되어 있다.

적용 대상:

```text
User
Board
Category
Post
Comment
```

`PostLike`, `Attachment`는 DB에 `updated_at`이 없으므로 BaseEntity를 상속하지 않는다.

### 연관관계 원칙

초기 단계에서는 양방향 컬렉션을 무리하게 추가하지 않고, 필요한 경우에만 **자식 Entity → 부모 Entity** 방향의 `@ManyToOne` 연관관계를 사용한다.

예:

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "board_id", nullable = false)
private Board board;
```

---

# 7. 회원 / 인증 구조

## 7-1. 회원가입

흐름:

```text
AuthController
      ↓
UserService
      ↓
BCryptPasswordEncoder
      ↓
UserRepository
      ↓
MariaDB
```

Endpoint:

```http
POST /api/auth/signup
```

회원가입 시 다음을 검증한다.

- username 중복
- nickname 중복
- email 중복
- 요청값 Validation
- password BCrypt 암호화

---

## 7-2. 로그인

```http
POST /api/auth/login
```

로그인 흐름:

```text
username/password
       ↓
User 조회
       ↓
BCrypt matches
       ↓
JwtTokenProvider
       ↓
Access Token 발급
```

로그인 응답에는 다음 정보가 포함된다.

```json
{
  "accessToken": "JWT...",
  "userId": 1,
  "username": "user01",
  "nickname": "사용자01",
  "role": "USER"
}
```

비밀번호는 응답하지 않는다.

---

## 7-3. JWT 인증

관련 클래스:

```text
security/
├── JwtTokenProvider.java
├── CustomUserDetailsService.java
└── JwtAuthenticationFilter.java
```

요청 흐름:

```text
Authorization: Bearer <JWT>
             ↓
JwtAuthenticationFilter
             ↓
JWT 검증
             ↓
username 추출
             ↓
CustomUserDetailsService
             ↓
SecurityContext 인증 등록
```

DB의 `USER`, `ADMIN` Role은 Spring Security에서 각각 다음과 같이 권한으로 사용한다.

```text
USER  → ROLE_USER
ADMIN → ROLE_ADMIN
```

---

# 8. 예외 처리 기준

전역 예외 처리는 `GlobalExceptionHandler`에서 담당한다.

| 상황 | HTTP |
|---|---:|
| Validation 실패 | 400 |
| 인증 실패 / 토큰 없음 | 401 |
| 인증은 되었지만 권한 부족 | 403 |
| 리소스 중복 / Business 충돌 | 409 |
| 리소스 없음 | 404 |

주요 예외:

```text
BusinessException
InvalidCredentialsException
ResourceNotFoundException
```

---

# 9. Board 기능

## 9-1. Board 역할

`boards`는 상위 게시판 단위이다.

예를 들어:

```text
자유게시판
├── 일반
├── 질문
└── 정보
```

처럼 Board 아래에 Category가 존재할 수 있다.

---

## 9-2. Board API

구현 대상 API:

```http
GET    /api/boards
GET    /api/boards/{boardId}
POST   /api/boards
PUT    /api/boards/{boardId}
DELETE /api/boards/{boardId}
```

### 권한 정책

```text
GET    → 인증 사용자
POST   → ADMIN
PUT    → ADMIN
DELETE → ADMIN
```

현재 프로젝트에서는 Spring Security에서 URL 권한을 적용하고, Service에서도 필요한 도메인 검증을 수행한다.

---

## 9-3. Board 생성

```http
POST /api/boards
```

ADMIN만 생성할 수 있다.

주요 검증:

- `name` 필수
- `name` 길이 검증
- 동일한 Board 이름 중복 방지

성공 응답은 `201 Created`를 사용한다.

---

## 9-4. Board 수정

```http
PUT /api/boards/{boardId}
```

검증:

- ADMIN 권한
- 대상 Board 존재 여부
- 이름 Validation
- 다른 Board와의 이름 중복 여부

---

## 9-5. Board 삭제

```http
DELETE /api/boards/{boardId}
```

검증:

- ADMIN 권한
- Board 존재 여부
- 연결된 Category / Post가 있는지 확인

DB 설계상 Category 또는 Post가 남아 있으면 삭제를 제한한다.

---

# 10. Board 테스트 완료 항목

Postman을 이용하여 다음 시나리오를 검증했다.

```text
GET 목록                 → 200 ✅
GET 상세                 → 200 ✅
존재하지 않는 Board      → 404 ✅
ADMIN 생성               → 201 ✅
USER 생성                → 403 ✅
인증 없이 생성           → 401 ✅
중복 Board 이름          → 409 ✅
Validation 오류          → 400 ✅
ADMIN 수정               → 200 ✅
권한 없는 수정            → 403 ✅
존재하지 않는 수정 대상   → 404 ✅
ADMIN 삭제               → 204 ✅
삭제 후 조회             → 404 ✅
권한 없는 삭제            → 403 ✅
인증 없이 삭제            → 401 ✅
```

### `/error` 관련 문제 해결

초기에는 권한 부족 요청이 내부적으로 `403`이 발생한 뒤 `/error` 요청이 다시 Security에 의해 차단되어 외부 응답이 `401`처럼 보이는 문제가 있었다.

이를 해결하기 위해 `/error`를 `permitAll` 대상으로 추가했다.

결과적으로 권한 부족 요청은 최종적으로 정상적인 `403 Forbidden`으로 확인되었다.

---

# 11. 개발 중 확인된 주요 수정 사항

## Post.content의 LONGTEXT 매핑

DB의 `posts.content`가 `LONGTEXT`이므로 JPA의 `@Lob`만 사용하는 대신 Hibernate Length를 이용한 명시적 길이 매핑을 사용했다.

```java
@Column(name = "content", nullable = false, length = Length.LONG32)
private String content;
```

이를 통해 `ddl-auto=validate` 환경에서 DB 스키마와 Entity 매핑을 일치시켰다.

## Repository 메서드

Spring Data JPA의 메서드 이름 기반 Query를 적극 사용한다.

예:

```java
boolean existsByBoardId(Long boardId);
boolean existsByBoardIdAndName(Long boardId, String name);
boolean existsByBoardIdAndNameAndIdNot(
    Long boardId,
    String name,
    Long categoryId
);
```

---

# 12. 현재까지의 개발 원칙

1. DB 설계를 먼저 확정하고 Flyway로 버전 관리한다.
2. Entity → Repository → DTO → Service → Controller 순으로 계층을 만든다.
3. Controller에서는 HTTP 요청/응답과 Validation을 담당한다.
4. Service에서는 비즈니스 규칙을 담당한다.
5. Repository에서는 DB 접근을 담당한다.
6. 인증은 JWT + Spring Security로 통일한다.
7. 비밀번호는 BCrypt로 저장한다.
8. 권한 부족은 403, 인증 실패는 401로 명확하게 구분한다.
9. 개발 단계마다 Postman / JUnit으로 기능을 검증한다.
10. 비밀 정보는 환경변수로 관리한다.

---

# 13. 다음 기능

Board 다음 단계는 **Post(게시글)** 이다.

예정 API:

```http
GET    /api/boards/{boardId}/posts
POST   /api/boards/{boardId}/posts
GET    /api/posts/{postId}
PUT    /api/posts/{postId}
DELETE /api/posts/{postId}
```

Post 구현에서는 다음 검증을 추가한다.

- 로그인 사용자만 작성 가능
- Board 존재 여부
- Category 존재 여부
- Category가 해당 Board에 속하는지 확인
- 수정/삭제 시 작성자 본인 확인
- 관리자 권한 처리 기준 결정
- 삭제 상태(`deleted_at`) 처리
- 조회수 / 좋아요 수 관리 기준

이 문서 이후부터는 Post 구현을 기준으로 개발을 이어간다.
