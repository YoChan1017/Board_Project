# Board_Project Backend 진행 정리

## 1. 프로젝트 개요

현재 프로젝트는 MariaDB + Spring Boot + React 기반의 실전형 게시판 프로젝트이다.
현재는 **Spring Boot Backend(`back`)** 중심으로 구현을 진행하고 있으며, DB 설계와 Migration을 먼저 구성한 뒤 API를 단계적으로 구현하고 있다.

### 저장소 기본 구조

```text
Board_Project/
├── db/          # DB 설계/문서/SQL
├── back/        # Spring Boot Backend
├── front/       # React Frontend (예정)
├── .github/     # GitHub Actions (예정)
└── README.md
```

---

## 2. 개발 환경

- Java: 21
- Spring Boot: 4.1.1
- Build: Maven
- IDE: Spring Tool Suite 4 (STS4)
- Database: MariaDB 10.6.x
- MariaDB Port: `3307`
- Database Name: `board_db`
- DB Username: `root`
- JPA/Hibernate: Hibernate ORM 7.4.5
- Migration: Flyway
- Security: Spring Security
- Password Hashing: BCrypt
- JWT: JJWT 0.13.0

### DB 접속 환경변수

실제 비밀번호는 코드/문서에 저장하지 않고 STS Run Configuration의 Environment Variables로 관리한다.

```text
DB_HOST=localhost
DB_PORT=3307
DB_NAME=board_db
DB_USERNAME=root
DB_PASSWORD=<실제 비밀번호>
```

JWT 관련 환경변수:

```text
JWT_SECRET=<Base64 형태의 비밀키>
JWT_EXPIRATION_MS=3600000
```

`JWT_SECRET`과 DB 비밀번호의 실제 값은 Git에 커밋하지 않는다.

---

# 3. DB 설계 및 Flyway

## 3-1. DB 테이블

현재 DB 설계는 다음 8개 테이블을 기준으로 한다.

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

### 주요 관계

```text
users
  └── posts
       ├── categories
       ├── comments
       ├── post_likes
       └── attachments

boards
  └── categories
  └── posts

comments
  └── parent comment (self reference)
```

## 3-2. Flyway Migration

총 7개의 Migration이 생성되었고 정상 적용되었다.

```text
V1__create_users.sql
V2__create_boards.sql
V3__create_categories.sql
V4__create_posts.sql
V5__create_comments.sql
V6__create_post_likes.sql
V7__create_attachments.sql
```

현재 Flyway 상태:

```text
Successfully validated 7 migrations
Current version of schema `board_db`: 7
Schema `board_db` is up to date.
```

---

# 4. Entity 구성

패키지:

```text
com.example.board.entity
```

현재 Entity:

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

Enum:

```text
com.example.board.enums.Role.java
```

Role:

```text
USER
ADMIN
```

## BaseEntity

`created_at`, `updated_at`을 관리하기 위해 Spring Data JPA Auditing을 사용한다.

적용 대상:

```text
User
Board
Category
Post
Comment
```

`PostLike`, `Attachment`는 DB 구조상 `updated_at`이 없으므로 `BaseEntity`를 사용하지 않는다.

---

# 5. Repository 구성

패키지:

```text
com.example.board.repository
```

현재 Repository:

```text
UserRepository.java
BoardRepository.java
CategoryRepository.java
PostRepository.java
CommentRepository.java
PostLikeRepository.java
AttachmentRepository.java
```

Spring Boot 실행 로그에서:

```text
Found 7 JPA repository interfaces.
```

가 확인되었다.

## UserRepository 주요 메서드

```java
boolean existsByUsername(String username);
boolean existsByNickname(String nickname);
boolean existsByEmail(String email);
Optional<User> findByUsername(String username);
```

---

# 6. DTO 구성

패키지:

```text
com.example.board.dto.auth
```

현재:

```text
SignupRequest.java
LoginRequest.java
LoginResponse.java
```

## SignupRequest

회원가입 입력값 검증:

```text
username: 4~50자, 필수
password: 8~100자, 필수
nickname: 2~50자, 필수
email: email 형식 검증, 최대 100자
```

## LoginRequest

```text
username: 필수
password: 필수
```

## LoginResponse

현재 로그인 성공 시 다음 정보를 반환한다.

```json
{
  "accessToken": "JWT...",
  "userId": 1,
  "username": "user01",
  "nickname": "사용자01",
  "role": "USER"
}
```

비밀번호는 응답에 포함하지 않는다.

---

# 7. 회원가입 기능

## 구성

```text
AuthController
    ↓
UserService
    ↓
UserRepository
    ↓
MariaDB
```

Endpoint:

```http
POST /api/auth/signup
```

예시 요청:

```json
{
  "username": "user01",
  "password": "password123",
  "nickname": "사용자01",
  "email": "user01@test.com"
}
```

성공:

```text
201 Created
```

```json
{
  "userId": 1
}
```

## 회원가입 검증 완료

- 정상 회원가입 ✅
- BCrypt 비밀번호 암호화 ✅
- username 중복 검사 ✅
- nickname 중복 검사 ✅
- email 중복 검사 ✅
- 입력값 Validation ✅
- MariaDB 실제 저장 확인 ✅

DB에서는 비밀번호가 평문이 아니라 다음과 같은 BCrypt 해시로 저장되는 것을 확인했다.

```text
$2a$10$...
```

---

# 8. 예외 처리

패키지:

```text
com.example.board.exception
```

현재:

```text
ErrorResponse.java
BusinessException.java
InvalidCredentialsException.java
GlobalExceptionHandler.java
```

## HTTP 상태 코드

```text
400 Bad Request
→ Validation 실패

409 Conflict
→ 회원가입 중복(username/nickname/email)

401 Unauthorized
→ 로그인 인증 실패 또는 JWT 없음/유효하지 않음

403 Forbidden
→ 인증은 되었지만 권한이 없는 경우
```

## Validation 오류 응답

예:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "username: ... , password: ..."
}
```

## 로그인 인증 실패

username이 존재하지 않거나 password가 틀린 경우 동일한 메시지를 사용한다.

```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "username 또는 password가 올바르지 않습니다."
}
```

이를 통해 사용자 존재 여부를 외부에 불필요하게 노출하지 않는다.

---

# 9. 테스트

## UserRepositoryTest

JPA → MariaDB 조회가 정상 동작하는 것을 확인했다.

## UserServiceTest

다음 테스트를 수행했다.

```text
회원가입 성공 ✅
로그인 성공 ✅
잘못된 비밀번호 ✅
존재하지 않는 사용자 ✅
```

테스트에는 `@Transactional`을 사용하여 테스트 데이터가 롤백되도록 구성했다.

---

# 10. Security / JWT

## PasswordEncoder

`PasswordConfig.java`에서 BCryptPasswordEncoder를 Bean으로 등록했다.

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

## SecurityConfig

현재 인증 정책:

```text
/api/auth/signup → 인증 불필요
/api/auth/login  → 인증 불필요
그 외 요청        → 인증 필요
```

또한:

```text
CSRF disable
SessionCreationPolicy.STATELESS
JWT Filter 적용
```

구성을 사용한다.

## JWT 관련 클래스

패키지:

```text
com.example.board.security
```

현재:

```text
JwtTokenProvider.java
CustomUserDetailsService.java
JwtAuthenticationFilter.java
```

### JWT 흐름

```text
POST /api/auth/login
        ↓
username/password 검증
        ↓
BCrypt matches()
        ↓
JwtTokenProvider
        ↓
Access Token 발급
```

이후 요청:

```text
Authorization: Bearer <JWT>
        ↓
JwtAuthenticationFilter
        ↓
JWT 서명/만료 검증
        ↓
username 추출
        ↓
CustomUserDetailsService
        ↓
SecurityContext 인증 등록
```

---

# 11. JWT 테스트 완료

임시 인증 확인용 API:

```http
GET /api/auth/me
```

정상 JWT 없이 요청:

```text
401 Unauthorized ✅
```

정상 JWT 포함 요청:

```text
200 OK ✅
```

예:

```json
{
  "username": "user01"
}
```

잘못된 JWT도 인증되지 않도록 확인했다.

---

# 12. 현재 프로젝트 구조

```text
com.example.board
├── config
│   ├── PasswordConfig.java
│   └── SecurityConfig.java
│
├── controller
│   └── AuthController.java
│
├── dto
│   └── auth
│       ├── SignupRequest.java
│       ├── LoginRequest.java
│       └── LoginResponse.java
│
├── entity
│   ├── BaseEntity.java
│   ├── User.java
│   ├── Board.java
│   ├── Category.java
│   ├── Post.java
│   ├── Comment.java
│   ├── PostLike.java
│   └── Attachment.java
│
├── enums
│   └── Role.java
│
├── exception
│   ├── ErrorResponse.java
│   ├── BusinessException.java
│   ├── InvalidCredentialsException.java
│   └── GlobalExceptionHandler.java
│
├── repository
│   ├── UserRepository.java
│   ├── BoardRepository.java
│   ├── CategoryRepository.java
│   ├── PostRepository.java
│   ├── CommentRepository.java
│   ├── PostLikeRepository.java
│   └── AttachmentRepository.java
│
├── security
│   ├── JwtTokenProvider.java
│   ├── CustomUserDetailsService.java
│   └── JwtAuthenticationFilter.java
│
└── service
    └── UserService.java
```

---

# 13. Postman 검증 완료 목록

```text
회원가입
├── 정상 값 → 201 ✅
├── username 중복 → 409 ✅
├── nickname 중복 → 409 ✅
├── email 중복 → 409 ✅
└── 잘못된/빈 입력 → 400 ✅

로그인
├── 정상 값 → 200 + JWT ✅
├── 잘못된 password → 401 ✅
├── 존재하지 않는 username → 401 ✅
└── 빈 입력 → 400 ✅

JWT 인증
├── 토큰 없음 → 401 ✅
├── 잘못된 토큰 → 인증 실패 ✅
└── 정상 토큰 → 200 ✅
```

---

# 14. 확인된 경고

## Flyway / MariaDB

다음 경고가 발생하지만 Migration 및 애플리케이션 구동에는 영향을 주지 않는다.

```text
Unknown system variable 'WSREP_ON'
```

현재:

```text
7 migrations validated
schema version 7
application startup successful
```

상태이므로 기능상 문제는 확인되지 않았다.

## Spring Security generated password

초기 Security 자동 설정 시 개발용 generated password 경고가 출력되었다.
현재 `SecurityConfig`가 추가되어 실제 JWT 기반 인증 구조를 사용하고 있으므로 이후 불필요한 기본 Security 설정을 정리할 때 다시 확인한다.

## Mockito / ByteBuddy

테스트 실행 시 dynamic agent 관련 warning이 발생했지만 테스트 자체는 성공했다.

---

# 15. 보안 주의사항

- DB 비밀번호를 Git에 커밋하지 않는다.
- `JWT_SECRET`을 Git에 커밋하지 않는다.
- JWT Access Token을 로그에 출력하지 않는 것을 권장한다.
- DB 비밀번호와 JWT Secret이 외부에 노출된 경우 교체한다.

---

# 16. 다음 개발 단계

인증/회원 기능의 기본 흐름이 완성되었으므로 이제 **게시판 기능**으로 넘어간다.

권장 순서:

```text
1. BoardService
2. BoardController
3. 게시판 조회 API
4. 게시판 생성 API (ADMIN)
5. 게시판 수정 API (ADMIN)
6. 게시판 삭제 API (ADMIN)
7. PostService / PostController
8. 게시글 목록/상세/작성/수정/삭제
9. Comment
10. Like
11. Attachment
12. React Frontend 연결
13. Docker / CI/CD
```

## 다음 작업의 목표

첫 번째 게시판 기능으로 `BoardService`를 구현한다.

초기에는 다음 API를 목표로 한다.

```http
GET /api/boards
POST /api/boards
GET /api/boards/{boardId}
PUT /api/boards/{boardId}
DELETE /api/boards/{boardId}
```

권한 정책:

```text
GET    → 일반 사용자도 가능
POST   → ADMIN
PUT    → ADMIN
DELETE → ADMIN
```

다만 API를 한 번에 모두 만들지 않고,
**조회(GET) → 생성(ADMIN) → 수정 → 삭제** 순서로 하나씩 구현하고 Postman으로 검증한다.

---

# 17. 현재 작업 완료 기준

현재까지 완료한 핵심 목표:

```text
DB 설계                     ✅
Flyway Migration            ✅
Entity                      ✅
Repository                  ✅
회원가입 Service            ✅
회원가입 API                ✅
BCrypt                      ✅
회원가입 예외 처리          ✅
Validation                  ✅
로그인 Service              ✅
로그인 API                  ✅
JWT 발급                    ✅
JWT 인증 Filter             ✅
Spring Security 연동        ✅
Postman 인증 테스트         ✅
Service 로그인 테스트       ✅
```

**다음 작업 시작 지점: `BoardService.java` 구현**
