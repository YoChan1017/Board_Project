# Board Project 현재까지 진행 정리

## 기준일

2026-10-07

## 현재 개발 단계

**Spring Boot Backend 핵심 CRUD 구현 단계**

현재까지 DB 설계, Migration, Entity, Repository, 회원가입/로그인, JWT 인증/인가, Board CRUD, Category CRUD와 기능 테스트까지 완료했다.

---

# 1. 전체 진행 현황

| 영역 | 상태 | 비고 |
|---|---|---|
| 프로젝트 구조 설계 | ✅ 완료 | Monorepo: `db / back / front` |
| DB 요구사항 정리 | ✅ 완료 | `db/requirements.md` |
| ERD 설계 | ✅ 완료 | `db/erd/board-erd.md` |
| DB Schema 설계 | ✅ 완료 | 테이블별 Markdown |
| Flyway Migration | ✅ 완료 | V1 ~ V7 |
| Spring Boot 프로젝트 | ✅ 완료 | Spring Boot 4.1.1 |
| MariaDB 연결 | ✅ 완료 | `board_db`, port 3307 |
| Entity | ✅ 완료 | 8개 핵심 Entity/공통 Entity 포함 |
| Repository | ✅ 완료 | 7개 Repository |
| 회원가입 | ✅ 완료 | Validation + BCrypt |
| 로그인 | ✅ 완료 | JWT 발급 |
| JWT 인증 | ✅ 완료 | Filter + SecurityContext |
| 권한 처리 | ✅ 완료 | USER / ADMIN |
| 전역 예외 처리 | ✅ 완료 | 400/401/403/404/409 |
| Auth 테스트 | ✅ 완료 | JUnit + Postman |
| Board CRUD | ✅ 완료 | 권한/Validation 포함 |
| Board 테스트 | ✅ 완료 | Postman 전체 시나리오 검증 |
| Category CRUD | ✅ 완료 | Board 연계/중복 검사 포함 |
| Category 테스트 | ✅ 완료 | Postman 검증 완료 |
| Post | ⏳ 진행 예정 | 다음 작업 |
| Comment | ⏳ 예정 | Post 이후 |
| Like | ⏳ 예정 | Post 이후 |
| Attachment | ⏳ 예정 | Post 이후 |
| 검색 / 페이지네이션 | ⏳ 예정 | Post 기본 CRUD 이후 |
| React Frontend | ⏳ 예정 | Backend 핵심 API 이후 |
| Docker | ⏳ 예정 | Backend/Frontend/DB 통합 |
| GitHub Actions | ⏳ 예정 | CI/CD |
| 운영 배포 | ⏳ 예정 | 최종 단계 |

---

# 2. 현재 Repository 구조

```text
Board_Project/
├── db/
├── back/
├── front/
├── .github/
├── README.md
└── PROJECT_PLAN.md
```

Backend 패키지 기준:

```text
com.example.board
├── config
├── controller
├── dto
├── entity
├── enums
├── exception
├── repository
├── security
└── service
```

---

# 3. DB 상태

현재 핵심 테이블:

```text
users
boards
categories
posts
comments
post_likes
attachments
```

Flyway:

```text
V1__create_users.sql
V2__create_boards.sql
V3__create_categories.sql
V4__create_posts.sql
V5__create_comments.sql
V6__create_post_likes.sql
V7__create_attachments.sql
```

현재 Schema Version:

```text
7
```

Migration은 정상 적용된 상태다.

---

# 4. 인증 / 보안 상태

### 회원가입

```http
POST /api/auth/signup
```

검증 완료:

```text
정상 가입              ✅
username 중복          ✅
nickname 중복          ✅
email 중복             ✅
Validation             ✅
BCrypt 저장            ✅
```

### 로그인

```http
POST /api/auth/login
```

검증 완료:

```text
정상 로그인             ✅
잘못된 password         ✅ 401
존재하지 않는 username  ✅ 401
빈 입력                 ✅ 400
JWT 발급                ✅
```

### JWT 인증

```http
GET /api/auth/me
```

검증 완료:

```text
정상 JWT     → 200 ✅
토큰 없음    → 401 ✅
잘못된 토큰  → 인증 실패 ✅
```

---

# 5. Board 상태

현재 API:

```text
GET    /api/boards
GET    /api/boards/{boardId}
POST   /api/boards
PUT    /api/boards/{boardId}
DELETE /api/boards/{boardId}
```

권한:

```text
조회     → 인증 사용자
생성     → ADMIN
수정     → ADMIN
삭제     → ADMIN
```

테스트 완료:

```text
조회 성공                     ✅
상세 조회                     ✅
존재하지 않는 Board            ✅ 404
ADMIN 생성                    ✅ 201
USER 생성                     ✅ 403
인증 없이 생성                ✅ 401
중복 이름                     ✅ 409
Validation                    ✅ 400
ADMIN 수정                    ✅ 200
USER 수정                     ✅ 403
인증 없이 수정                ✅ 401
존재하지 않는 대상 수정        ✅ 404
ADMIN 삭제                    ✅ 204
USER 삭제                     ✅ 403
인증 없이 삭제                ✅ 401
삭제 후 조회                  ✅ 404
```

---

# 6. Category 상태

현재 API:

```text
GET    /api/boards/{boardId}/categories
POST   /api/boards/{boardId}/categories
GET    /api/categories/{categoryId}
PUT    /api/categories/{categoryId}
DELETE /api/categories/{categoryId}
```

주요 검증:

```text
Board 존재 여부                 ✅
Category 존재 여부              ✅
동일 Board 내 이름 중복         ✅
Category 이름 Validation        ✅
ADMIN 생성/수정/삭제 권한       ✅
```

Category 테스트까지 완료된 상태이며, 다음 개발부터 Post 기능으로 넘어간다.

---

# 7. 중요 구현 기준

## Entity

- `BaseEntity`를 이용해 생성/수정 시간을 관리
- 연관관계는 우선 단방향 `ManyToOne` 중심
- 불필요한 양방향 컬렉션은 초기 구현에서 만들지 않음
- `Post.content`는 MariaDB LONGTEXT와 맞도록 Hibernate Length를 사용

## Repository

Spring Data JPA 메서드 이름 기반 Query를 우선 사용한다.

예:

```java
existsByBoardId(...)
existsByBoardIdAndName(...)
findByBoardId(...)
```

## Service

비즈니스 규칙은 Service에서 처리한다.

예:

```text
중복 이름 검사
부모 Entity 존재 여부
연관 Entity의 관계 검증
작성자 확인
권한에 따른 작업 제한
```

## Controller

Controller는 다음 책임에 집중한다.

```text
HTTP Method
Path Variable
Request Body
Validation
HTTP Status / Response
```

---

# 8. 개발 중 해결한 주요 이슈

### JPA validation과 LONGTEXT 불일치

`Post.content`에 `@Lob`을 사용했을 때 DB의 LONGTEXT와 `ddl-auto=validate` 검증이 맞지 않는 문제가 있었다.

다음 형태로 수정했다.

```java
@Column(name = "content", nullable = false, length = Length.LONG32)
private String content;
```

### CategoryRepository 메서드 누락

Board 삭제 검증과 Category 기능 양쪽에서 필요한 메서드가 있어 다음 메서드들을 유지해야 한다.

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

### `/error` 재인증 문제

권한 부족 요청이 내부적으로 `/error`로 전달되면서 실제 403이 최종 응답에서 401처럼 보이는 문제가 있었다.

`/error`를 `permitAll`에 포함하여 해결했다.

---

# 9. 현재 파일 구성의 핵심

```text
entity/
├── BaseEntity.java
├── User.java
├── Board.java
├── Category.java
├── Post.java
├── Comment.java
├── PostLike.java
└── Attachment.java

repository/
├── UserRepository.java
├── BoardRepository.java
├── CategoryRepository.java
├── PostRepository.java
├── CommentRepository.java
├── PostLikeRepository.java
└── AttachmentRepository.java

security/
├── JwtTokenProvider.java
├── CustomUserDetailsService.java
└── JwtAuthenticationFilter.java
```

Post Entity까지 이미 존재하므로 Post 기능은 **기존 Entity를 기준으로 Repository → DTO → Service → Controller 순으로 구현**한다.

---

# 10. 다음 작업: Post

## 1단계

Post Entity와 Repository를 확인한다.

필요 Repository 예:

```java
public interface PostRepository extends JpaRepository<Post, Long> {

    List<Post> findByBoardIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long boardId);

    Optional<Post> findByIdAndDeletedAtIsNull(Long postId);
}
```

단, 실제 조회/페이지네이션 요구사항을 구현할 때 Query와 반환 구조를 다시 결정한다.

## 2단계

DTO:

```text
PostCreateRequest
PostUpdateRequest
PostResponse
PostListResponse
```

## 3단계

Service:

```text
게시글 목록
게시글 상세
게시글 생성
게시글 수정
게시글 삭제
```

## 4단계

작성자 및 연관관계 검증:

```text
Board 존재 여부
Category 존재 여부
Category ↔ Board 일치 여부
User 인증 정보
작성자 본인 여부
```

## 5단계

Postman 테스트:

```text
목록 조회
상세 조회
작성
수정
삭제
잘못된 Board
잘못된 Category
다른 Board의 Category
다른 사용자의 수정/삭제
Validation 오류
토큰 없음
```

---

# 11. 최종 개발 순서

```text
[완료]
DB 설계
  ↓
Flyway
  ↓
Entity / Repository
  ↓
회원가입 / 로그인
  ↓
JWT / Security
  ↓
Board CRUD
  ↓
Category CRUD

[현재]
Post CRUD
  ↓
Comment
  ↓
Like
  ↓
Attachment
  ↓
검색 / 페이지네이션
  ↓
Backend 테스트 보강
  ↓
React Frontend
  ↓
Docker
  ↓
GitHub Actions CI/CD
  ↓
배포
```

---

# 12. 다음 작업 시작점

**현재 시작 지점: Post 기능 구현**

첫 작업은 이미 존재하는 `Post.java`를 기준으로 `PostRepository`를 확정하는 것이다.

그 다음 DTO → Service → Controller → Postman 테스트 순서로 진행한다.
