# 게시판 프로젝트 설계 및 개발 계획

## 1. 프로젝트 개요

### 1.1 프로젝트명

`board-project`

### 1.2 프로젝트 목적

MariaDB + Spring Boot + React 기반의 게시판 서비스를 구축하고, GitHub 및 GitHub Actions를 이용한 CI/CD까지 구성한다.

단순한 CRUD 게시판에 그치지 않고 다음과 같은 실무 개발 흐름을 경험하는 것을 목표로 한다.

- 요구사항 및 데이터 모델 설계
- REST API 설계
- Spring Boot 기반 Backend 개발
- React 기반 Frontend 개발
- MariaDB 데이터베이스 설계
- Flyway 기반 Database Migration
- Spring Security 기반 인증/인가
- JWT 기반 로그인
- 게시글/댓글/좋아요/첨부파일
- 검색 및 페이지네이션
- 테스트 코드
- Docker 기반 실행 환경
- GitHub Actions 기반 CI/CD
- 운영 서버 자동 배포

---

# 2. 전체 시스템 구조

```text
┌─────────────────────────────────────────────┐
│                   Client                    │
│                                             │
│                React Frontend                │
└──────────────────────┬──────────────────────┘
                       │ HTTP / HTTPS
                       │ JSON
                       ▼
┌─────────────────────────────────────────────┐
│               Spring Boot Backend            │
│                                             │
│ Controller → Service → Repository → JPA     │
│                  │                          │
│            Spring Security                  │
│                  │                          │
│                Flyway                       │
└──────────────────────┬──────────────────────┘
                       │ JDBC
                       ▼
┌─────────────────────────────────────────────┐
│                 MariaDB                     │
│                                             │
│ users / boards / posts / comments / ...     │
└─────────────────────────────────────────────┘
```

배포 환경에서는 다음 구조를 목표로 한다.

```text
Internet
   │
   ▼
Nginx
   │
   ├── /       → React Frontend
   │
   └── /api    → Spring Boot Backend
                       │
                       ▼
                    MariaDB
```

---

# 3. Repository 구조

초기에는 하나의 GitHub Repository에서 Backend, Frontend, Database Migration을 함께 관리하는 Monorepo 방식을 사용한다.

```text
board-project/
│
├── back/                              # Spring Boot Backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com.example.board/
│   │   │   │       ├── controller/
│   │   │   │       ├── service/
│   │   │   │       ├── repository/
│   │   │   │       ├── entity/
│   │   │   │       ├── dto/
│   │   │   │       ├── security/
│   │   │   │       ├── exception/
│   │   │   │       └── config/
│   │   │   │
│   │   │   └── resources/
│   │   │       ├── db/
│   │   │       │   └── migration/
│   │   │       ├── application.yml
│   │   │       └── application-local.yml
│   │   │
│   │   └── test/
│   │       └── java/
│   │
│   ├── build.gradle
│   ├── settings.gradle
│   ├── Dockerfile
│   └── .dockerignore
│
├── front/                             # React Frontend
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── .dockerignore
│
├── infra/                             # 운영/인프라 관련 설정
│   ├── nginx/
│   │   └── nginx.conf
│   └── docker/
│       └── ...
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       └── deploy.yml
│
├── docker-compose.yml                  # 로컬 통합 실행
├── .gitignore
├── README.md
└── PROJECT_PLAN.md
```

> Database 자체를 Git에 저장하지 않는다.
>
> Database의 구조 변경은 Flyway Migration SQL을 통해 코드와 함께 Git에서 관리한다.

---

# 4. Git Branch 전략

DB, Backend, Frontend를 각각 별도 브랜치로 나누지 않는다.

잘못된 예:

```text
db
backend
frontend
```

권장 방식:

```text
main
│
├── feature/auth
├── feature/board
├── feature/comment
├── feature/like
├── feature/file-upload
├── feature/search
└── fix/...
```

## 4.1 main

배포 가능한 안정 버전만 유지한다.

```text
main
 ↓
CI
 ↓
Docker Build
 ↓
Deploy
```

## 4.2 feature 브랜치

하나의 기능을 개발하는 브랜치이다.

예:

```text
feature/comment
```

에서는 다음을 동시에 수정할 수 있다.

```text
DB Migration
+ Spring Backend
+ React Frontend
```

예:

```text
feature/comment
│
├── back/
│   └── Comment 관련 코드
│
└── ...
    └── Frontend 댓글 UI
```

## 4.3 권장 작업 흐름

```text
main
  │
  └── feature/board
         │
         ├── 개발
         ├── 테스트
         ├── commit
         └── push
                │
                ▼
          Pull Request
                │
                ▼
            CI 검사
                │
                ▼
             Merge
                │
                ▼
              main
                │
                ▼
              CD 배포
```

---

# 5. 개발 순서

## Phase 1. 요구사항 정의

먼저 구현할 기능을 정의한다.

### 회원

- 회원가입
- 로그인
- 로그아웃
- 내 정보 조회
- 회원 정보 수정
- 권한 관리

### 게시판

- 게시판 목록
- 게시글 목록
- 게시글 상세
- 게시글 작성
- 게시글 수정
- 게시글 삭제

### 댓글

- 댓글 작성
- 댓글 수정
- 댓글 삭제
- 대댓글

### 추가 기능

- 좋아요
- 첨부파일
- 검색
- 페이지네이션
- 관리자 기능

---

# 6. DB 설계

초기 핵심 테이블은 다음과 같이 구성한다.

```text
users
boards
categories
posts
comments
post_likes
attachments
```

확장 시 다음 테이블을 추가할 수 있다.

```text
refresh_tokens
bookmarks
comment_likes
reports
notifications
audit_logs
```

---

# 7. DB 관계

```text
users
  │
  ├───────────────┐
  │               │
  ▼               ▼
posts           comments
  │               │
  │               └── parent_id → comments.id
  │
  ├───────────────► post_likes
  │
  └───────────────► attachments
  │
  ▼
boards
  │
  ▼
categories
```

관계 상세:

```text
users 1 : N posts
users 1 : N comments
users 1 : N post_likes
boards 1 : N posts
boards 1 : N categories
categories 1 : N posts
posts 1 : N comments
posts 1 : N post_likes
posts 1 : N attachments
comments 1 : N comments
```

---

# 8. DB 테이블 설계

## 8.1 users

회원 정보를 저장한다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 회원 ID |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 로그인 ID |
| password | VARCHAR(255) | NOT NULL | 암호화된 비밀번호 |
| nickname | VARCHAR(50) | UNIQUE, NOT NULL | 닉네임 |
| email | VARCHAR(100) | UNIQUE | 이메일 |
| role | VARCHAR(20) | NOT NULL | USER / ADMIN |
| created_at | DATETIME | NOT NULL | 생성 시간 |
| updated_at | DATETIME | NOT NULL | 수정 시간 |
| deleted_at | DATETIME | NULL | Soft Delete |

주의:

- password에는 원문 비밀번호를 저장하지 않는다.
- BCrypt 등으로 해시한 값을 저장한다.
- 회원 삭제가 필요한 경우 `deleted_at`을 이용한 Soft Delete를 고려한다.

---

## 8.2 boards

게시판 자체를 관리한다.

예:

```text
자유게시판
질문게시판
공지사항
자료실
```

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 게시판 ID |
| name | VARCHAR(100) | NOT NULL | 게시판 이름 |
| description | VARCHAR(255) | NULL | 설명 |
| created_at | DATETIME | NOT NULL | 생성 시간 |
| updated_at | DATETIME | NOT NULL | 수정 시간 |

---

## 8.3 categories

게시판 내부 카테고리를 관리한다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 카테고리 ID |
| board_id | BIGINT | FK, NOT NULL | 게시판 ID |
| name | VARCHAR(100) | NOT NULL | 카테고리 이름 |
| created_at | DATETIME | NOT NULL | 생성 시간 |

예:

```text
자유게시판
 ├── 일상
 ├── 게임
 ├── 질문
 └── 기타
```

---

## 8.4 posts

게시글 본문을 저장한다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 게시글 ID |
| board_id | BIGINT | FK, NOT NULL | 게시판 ID |
| category_id | BIGINT | FK, NULL | 카테고리 ID |
| user_id | BIGINT | FK, NOT NULL | 작성자 ID |
| title | VARCHAR(200) | NOT NULL | 제목 |
| content | TEXT | NOT NULL | 본문 |
| view_count | INT | NOT NULL DEFAULT 0 | 조회수 |
| like_count | INT | NOT NULL DEFAULT 0 | 좋아요 수 |
| created_at | DATETIME | NOT NULL | 생성 시간 |
| updated_at | DATETIME | NOT NULL | 수정 시간 |
| deleted_at | DATETIME | NULL | Soft Delete |

권장 인덱스:

```sql
INDEX idx_posts_board_created (board_id, created_at),
INDEX idx_posts_user (user_id),
INDEX idx_posts_category (category_id)
```

---

## 8.5 comments

댓글 및 대댓글을 저장한다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 댓글 ID |
| post_id | BIGINT | FK, NOT NULL | 게시글 ID |
| user_id | BIGINT | FK, NOT NULL | 작성자 ID |
| parent_id | BIGINT | FK, NULL | 부모 댓글 ID |
| content | VARCHAR(1000) | NOT NULL | 댓글 내용 |
| created_at | DATETIME | NOT NULL | 생성 시간 |
| updated_at | DATETIME | NOT NULL | 수정 시간 |
| deleted_at | DATETIME | NULL | Soft Delete |

대댓글:

```text
댓글 A
 ├── 댓글 B
 └── 댓글 C
```

예:

```text
A: id=1, parent_id=NULL
B: id=2, parent_id=1
C: id=3, parent_id=1
```

---

## 8.6 post_likes

사용자별 게시글 좋아요 기록을 저장한다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 좋아요 ID |
| post_id | BIGINT | FK, NOT NULL | 게시글 ID |
| user_id | BIGINT | FK, NOT NULL | 회원 ID |
| created_at | DATETIME | NOT NULL | 좋아요 시간 |

중복 좋아요 방지:

```sql
UNIQUE (post_id, user_id)
```

게시글 목록에서 빠르게 좋아요 수를 표시하기 위해 `posts.like_count`를 별도로 유지할 수도 있다.

---

## 8.7 attachments

첨부파일 메타데이터를 저장한다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 파일 ID |
| post_id | BIGINT | FK, NOT NULL | 게시글 ID |
| original_name | VARCHAR(255) | NOT NULL | 원본 파일명 |
| stored_name | VARCHAR(255) | NOT NULL | 서버 저장 파일명 |
| file_path | VARCHAR(500) | NOT NULL | 파일 저장 경로 |
| file_size | BIGINT | NULL | 파일 크기 |
| content_type | VARCHAR(100) | NULL | MIME Type |
| created_at | DATETIME | NOT NULL | 업로드 시간 |

실제 파일 데이터는 DB BLOB에 직접 넣기보다는 파일 서버, Object Storage, S3 등의 외부 저장소를 사용하는 방향을 고려한다.

---

# 9. Flyway Migration

Spring Boot에서 DB 구조를 직접 Hibernate에 맡기기보다 Flyway로 명시적인 Migration을 관리한다.

구조:

```text
back/
└── src/main/resources/
    └── db/
        └── migration/
            ├── V1__create_users.sql
            ├── V2__create_boards.sql
            ├── V3__create_categories.sql
            ├── V4__create_posts.sql
            ├── V5__create_comments.sql
            ├── V6__create_post_likes.sql
            └── V7__create_attachments.sql
```

## 원칙

- 기존 Migration 파일을 수정하지 않는다.
- 변경 사항은 새로운 Migration으로 추가한다.
- 운영 DB를 직접 수정하기보다 Migration을 통해 변경한다.

예:

```text
V1__create_users.sql
V2__create_boards.sql
V3__create_posts.sql
```

게시글 조회수 기능을 추가한다면 기존 `V3`을 수정하지 않고:

```text
V4__add_post_view_count.sql
```

을 추가한다.

---

# 10. Spring Boot Backend 구조

권장 패키지:

```text
com.example.board/
├── controller/
├── service/
├── repository/
├── entity/
├── dto/
├── security/
├── exception/
└── config/
```

## Controller

HTTP 요청과 응답을 담당한다.

```text
PostController
CommentController
AuthController
BoardController
```

## Service

비즈니스 로직을 담당한다.

```text
PostService
CommentService
AuthService
BoardService
```

## Repository

DB 접근을 담당한다.

```text
PostRepository
CommentRepository
UserRepository
BoardRepository
```

## Entity

DB Table과 매핑한다.

```text
User
Board
Category
Post
Comment
PostLike
Attachment
```

## DTO

API 요청/응답 데이터와 Entity를 분리한다.

```text
request/
response/
```

예:

```text
CreatePostRequest
UpdatePostRequest
PostResponse
PostListResponse
```

---

# 11. Backend 개발 순서

```text
Spring Boot 생성
        ↓
MariaDB 연결
        ↓
Flyway 연결
        ↓
Entity
        ↓
Repository
        ↓
Service
        ↓
Controller
        ↓
Validation
        ↓
Exception Handler
        ↓
Spring Security
        ↓
JWT
        ↓
API Test
```

---

# 12. 인증/인가

Spring Security + JWT를 사용한다.

기본 권한:

```text
USER
ADMIN
```

예:

```text
USER
 ├── 게시글 작성
 ├── 자신의 게시글 수정/삭제
 └── 댓글 작성

ADMIN
 ├── 모든 게시글 관리
 ├── 게시판 관리
 └── 사용자 관리
```

인증 흐름:

```text
React
  │
  │ POST /api/auth/login
  ▼
Spring Security
  │
  ▼
JWT 발급
  │
  ▼
React
  │
  │ Authorization: Bearer <token>
  ▼
Protected API
```

토큰 보안 정책은 실제 배포 환경에서 HttpOnly Cookie 방식 등을 검토한다.

---

# 13. REST API 설계

## 인증

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/users/me
```

## 게시판

```text
GET    /api/boards
POST   /api/boards
GET    /api/boards/{boardId}
PUT    /api/boards/{boardId}
DELETE /api/boards/{boardId}
```

## 게시글

```text
GET    /api/boards/{boardId}/posts
POST   /api/boards/{boardId}/posts

GET    /api/posts/{postId}
PUT    /api/posts/{postId}
DELETE /api/posts/{postId}
```

## 댓글

```text
GET    /api/posts/{postId}/comments
POST   /api/posts/{postId}/comments
PUT    /api/comments/{commentId}
DELETE /api/comments/{commentId}
```

## 좋아요

```text
POST   /api/posts/{postId}/like
DELETE /api/posts/{postId}/like
GET    /api/posts/{postId}/like
```

## 첨부파일

```text
POST   /api/posts/{postId}/attachments
GET    /api/attachments/{attachmentId}
DELETE /api/attachments/{attachmentId}
```

검색/페이지네이션:

```text
GET /api/boards/{boardId}/posts?page=0&size=20
GET /api/boards/{boardId}/posts?keyword=spring
```

---

# 14. React Frontend 구조

```text
front/
└── src/
    ├── api/                  # Axios 등 API 통신
    ├── assets/               # 이미지, 아이콘
    ├── components/           # 공통 컴포넌트
    ├── hooks/                # Custom Hook
    ├── pages/                # 페이지
    ├── routes/               # Router
    ├── store/                # 전역 상태
    ├── types/                # 타입 정의
    └── utils/                # 공통 유틸리티
```

주요 페이지:

```text
LoginPage
SignupPage
BoardListPage
PostListPage
PostDetailPage
PostCreatePage
PostEditPage
MyPage
AdminPage
```

주요 컴포넌트:

```text
Header
Navigation
PostCard
PostList
PostForm
CommentList
CommentForm
Pagination
Modal
Loading
ErrorMessage
```

---

# 15. React ↔ Spring 통신

React가 MariaDB에 직접 연결하지 않는다.

```text
React
  │
  │ REST API
  ▼
Spring Boot
  │
  │ JPA
  ▼
MariaDB
```

예:

```text
React
GET /api/posts/10
        ↓
PostController
        ↓
PostService
        ↓
PostRepository
        ↓
MariaDB
        ↓
PostResponse
        ↓
React
```

---

# 16. 페이지네이션

게시글 목록 API 예:

```http
GET /api/boards/1/posts?page=0&size=20
```

응답 예:

```json
{
  "content": [
    {
      "id": 1,
      "title": "게시글 제목",
      "nickname": "user01",
      "viewCount": 10,
      "likeCount": 3
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5
}
```

Spring Data JPA의 `Pageable`을 활용한다.

---

# 17. 검색

초기에는 제목/본문 검색부터 구현한다.

```text
검색어
 ↓
React
 ↓
GET /api/boards/1/posts?keyword=Spring
 ↓
Spring
 ↓
MariaDB
```

데이터 규모가 커지면 MariaDB Full-Text Search 또는 별도의 검색 시스템(예: Elasticsearch/OpenSearch) 도입을 검토한다.

---

# 18. Soft Delete

게시글/댓글을 실제로 DELETE하지 않고 삭제 시간을 기록하는 방식이다.

예:

```text
deleted_at = NULL
```

→ 정상 데이터

```text
deleted_at = 2026-10-04 15:00:00
```

→ 삭제된 데이터

일반 조회:

```sql
WHERE deleted_at IS NULL
```

관리자/감사 목적 조회에서는 삭제 데이터를 별도로 확인할 수 있다.

---

# 19. Git Commit 규칙

Commit 메시지는 일정한 형식으로 관리한다.

예:

```text
feat: 회원가입 API 구현
feat: 게시글 CRUD 구현
feat: 댓글 작성 기능 추가

fix: 게시글 삭제 권한 오류 수정

refactor: PostService 구조 개선

test: 댓글 서비스 테스트 추가

chore: Flyway 설정 추가

docs: README 작성
```

권장 Prefix:

```text
feat
fix
refactor
test
chore
docs
```

---

# 20. CI/CD 구성

## 20.1 CI

GitHub에 Push 또는 Pull Request가 발생하면 자동으로 실행한다.

### Backend CI

```text
Push / PR
   ↓
GitHub Actions
   ↓
Checkout
   ↓
Java 설정
   ↓
Gradle Test
   ↓
Gradle Build
```

### Frontend CI

```text
Push / PR
   ↓
GitHub Actions
   ↓
Checkout
   ↓
Node.js 설정
   ↓
npm ci
   ↓
Lint
   ↓
Test
   ↓
npm run build
```

---

# 21. CD

`main`에 Merge되면 운영 배포를 실행한다.

```text
main Merge
   ↓
GitHub Actions
   ↓
Backend Build
   ↓
Frontend Build
   ↓
Docker Image Build
   ↓
Container Registry Push
   ↓
운영 서버 접속
   ↓
Docker Pull
   ↓
Container 재배포
   ↓
Flyway Migration
   ↓
서비스 정상화
```

---

# 22. Docker 구성

초기 로컬 환경:

```text
docker-compose.yml
```

예상 서비스:

```text
services:
  db
  backend
  frontend
  nginx
```

운영 환경에서는 MariaDB를 반드시 동일한 컨테이너로 관리할 필요는 없다.

가능한 구조:

```text
Server
├── Nginx
├── Frontend Container
└── Backend Container

Managed Database
└── MariaDB
```

또는

```text
Server
├── Nginx
├── Frontend
├── Backend
└── MariaDB + Persistent Volume
```

프로젝트 규모와 운영 방식에 따라 선택한다.

---

# 23. Secret 관리

GitHub Repository에 다음과 같은 정보를 직접 커밋하지 않는다.

```text
DB Password
JWT Secret
API Key
SSH Private Key
Cloud Credentials
```

GitHub Actions에서는 GitHub Secrets를 사용한다.

예:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USERNAME
DB_PASSWORD
JWT_SECRET
SERVER_HOST
SERVER_USERNAME
SERVER_SSH_KEY
```

운영 서버의 환경 변수 또는 Secret Manager도 활용한다.

---

# 24. 개발 단계별 체크리스트

## Phase 1 - 프로젝트 초기화

- [ ] GitHub Repository 생성
- [ ] `main` 브랜치 생성
- [ ] `back` 디렉터리 생성
- [ ] `front` 디렉터리 생성
- [ ] `.github/workflows` 생성
- [ ] `.gitignore` 작성
- [ ] README 작성

## Phase 2 - DB 설계

- [ ] 요구사항 정리
- [ ] ERD 작성
- [ ] users 설계
- [ ] boards 설계
- [ ] categories 설계
- [ ] posts 설계
- [ ] comments 설계
- [ ] post_likes 설계
- [ ] attachments 설계
- [ ] Index 설계

## Phase 3 - DB 구축

- [ ] MariaDB 설치
- [ ] `board_db` 생성
- [ ] Spring Boot MariaDB 연결
- [ ] Flyway 설정
- [ ] V1 Migration 작성
- [ ] V2 Migration 작성
- [ ] V3 Migration 작성
- [ ] 테이블 생성 확인

## Phase 4 - Backend

- [ ] Spring Boot 설정
- [ ] Entity
- [ ] Repository
- [ ] DTO
- [ ] Service
- [ ] Controller
- [ ] Validation
- [ ] Exception Handler
- [ ] Swagger/OpenAPI
- [ ] 회원가입
- [ ] 로그인
- [ ] JWT
- [ ] 게시판 CRUD
- [ ] 게시글 CRUD
- [ ] 댓글 CRUD
- [ ] 좋아요
- [ ] 파일 업로드
- [ ] 검색
- [ ] 페이지네이션
- [ ] 권한 처리

## Phase 5 - Frontend

- [ ] React + Vite
- [ ] Router
- [ ] API Client
- [ ] 로그인
- [ ] 회원가입
- [ ] 게시판 목록
- [ ] 게시글 목록
- [ ] 게시글 상세
- [ ] 게시글 작성
- [ ] 게시글 수정
- [ ] 댓글
- [ ] 좋아요
- [ ] 파일 업로드
- [ ] 검색
- [ ] 페이지네이션
- [ ] 관리자 화면

## Phase 6 - Test

- [ ] Service Unit Test
- [ ] Repository Test
- [ ] Controller Test
- [ ] 인증 테스트
- [ ] 권한 테스트
- [ ] 게시글 CRUD 테스트
- [ ] 댓글 테스트
- [ ] Frontend 주요 기능 테스트

## Phase 7 - Docker

- [ ] Backend Dockerfile
- [ ] Frontend Dockerfile
- [ ] docker-compose 작성
- [ ] 로컬 통합 테스트
- [ ] Nginx 설정

## Phase 8 - CI

- [ ] Backend CI
- [ ] Frontend CI
- [ ] Test 자동 실행
- [ ] Build 자동 실행
- [ ] PR 검사
- [ ] Branch Protection 설정

## Phase 9 - 서버

- [ ] Linux 서버 준비
- [ ] Docker 설치
- [ ] Nginx 설치/설정
- [ ] 환경 변수 설정
- [ ] MariaDB 구성
- [ ] 방화벽 설정
- [ ] HTTPS 적용

## Phase 10 - CD

- [ ] Container Registry 설정
- [ ] Backend Image Build
- [ ] Frontend Image Build
- [ ] Registry Push
- [ ] 서버 자동 접속
- [ ] Docker Pull
- [ ] Container 재배포
- [ ] Flyway 자동 Migration
- [ ] 배포 실패 처리
- [ ] Health Check

---

# 25. 최종 Git / 배포 흐름

```text
                    GitHub Repository
                           │
                    ┌──────┴──────┐
                    │             │
                  main       feature/*
                    │             │
                    │          개발/테스트
                    │             │
                    │         Pull Request
                    │             │
                    └──────┬──────┘
                           │
                           ▼
                    GitHub Actions
                           │
                   ┌───────┴───────┐
                   │               │
                  CI              CD
                   │               │
              Test / Build    Docker Build
                   │               │
                   │          Registry Push
                   │               │
                   └───────────────┤
                                   ▼
                              운영 서버
                                   │
                        ┌──────────┴──────────┐
                        │                     │
                     Nginx              Spring Boot
                        │                     │
                     React               Flyway
                                              │
                                              ▼
                                           MariaDB
```

---

# 26. 최종 목표 구조

```text
board-project/
│
├── back/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com.example.board/
│   │   │   │       ├── controller/
│   │   │   │       ├── service/
│   │   │   │       ├── repository/
│   │   │   │       ├── entity/
│   │   │   │       ├── dto/
│   │   │   │       ├── security/
│   │   │   │       ├── exception/
│   │   │   │       └── config/
│   │   │   │
│   │   │   └── resources/
│   │   │       ├── db/
│   │   │       │   └── migration/
│   │   │       └── application.yml
│   │   │
│   │   └── test/
│   │
│   ├── build.gradle
│   └── Dockerfile
│
├── front/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── store/
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
│
├── infra/
│   ├── nginx/
│   │   └── nginx.conf
│   └── docker/
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       └── deploy.yml
│
├── docker-compose.yml
├── .gitignore
├── README.md
└── PROJECT_PLAN.md
```

---

# 27. 핵심 개발 원칙

1. **DB는 먼저 설계한다.**
2. **MariaDB Database 자체는 서버에 생성한다.**
3. **Table 구조는 Flyway Migration으로 관리한다.**
4. **DB/Backend/Frontend를 브랜치로 나누지 않는다.**
5. **기능 단위로 feature 브랜치를 생성한다.**
6. **React는 DB에 직접 접근하지 않는다.**
7. **Spring Boot가 API 및 비즈니스 로직을 담당한다.**
8. **Entity와 API DTO를 분리한다.**
9. **운영 DB는 사람이 직접 수정하기보다 Migration으로 변경한다.**
10. **GitHub Actions로 CI/CD를 자동화한다.**
11. **Secret을 Git에 커밋하지 않는다.**
12. **배포 환경에서는 Docker 및 Health Check를 사용한다.**

---

# 28. 권장 최초 작업 순서

처음 실제 코딩을 시작할 때는 다음 순서로 진행한다.

```text
1. GitHub Repository 생성
2. 프로젝트 디렉터리 생성
3. README / PROJECT_PLAN 작성
4. ERD 설계
5. MariaDB 설치 및 board_db 생성
6. Spring Boot 프로젝트 생성
7. MariaDB + Flyway 연결
8. users Migration 작성
9. User Entity / Repository 작성
10. 회원가입 API
11. 로그인 + Spring Security + JWT
12. boards Migration
13. posts Migration
14. 게시글 CRUD API
15. React 프로젝트 생성
16. 로그인 화면
17. 게시글 목록 화면
18. 게시글 상세 화면
19. 게시글 작성/수정 화면
20. 댓글
21. 좋아요
22. 첨부파일
23. 검색/페이지네이션
24. 테스트
25. Docker
26. GitHub Actions CI
27. 운영 서버
28. GitHub Actions CD
29. 자동 배포
30. 문서화 및 최종 정리
```

이 순서대로 진행하면 프로젝트의 각 단계가 서로 연결되고, 최종적으로 **DB 설계 → API 개발 → Frontend 연동 → 테스트 → 컨테이너화 → CI/CD → 운영 배포**까지 하나의 일관된 개발 이력으로 남는다.
