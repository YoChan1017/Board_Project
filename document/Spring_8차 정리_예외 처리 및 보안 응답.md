# Board Project 백엔드 통합 진행 문서

> 이 문서는 DB 설계, 회원 인증부터 게시판 핵심 기능, 첨부파일, 공통 예외 처리 및 보안 응답 정리까지 현재까지의 구현 내용을 통합해서 기록한다.

## 1. 프로젝트 개요

### 프로젝트 구조

```text
Board_Project/
├── db/
├── back/
├── front/
├── .github/
├── README.md
└── PROJECT_PLAN.md
```

### 기술 스택

- Java 21
- Spring Boot 4.1.1
- Spring Web, Spring Data JPA, Hibernate ORM 7.4.5
- MariaDB 10.6, Flyway
- Spring Security, JWT (JJWT 0.13.0)
- Bean Validation, Maven, STS4, Postman

### 로컬 개발 환경

- DB: `board_db`
- 호스트: `localhost`
- 개발 환경 MariaDB 포트: `3307`
- 사용자: `root`
- DB 비밀번호와 JWT Secret은 환경 변수로 관리한다.

주요 환경 변수:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USERNAME
DB_PASSWORD
JWT_SECRET
JWT_EXPIRATION_MS
```

`DB_PORT`는 환경 변수로 지정한 값이 기본값보다 우선한다. 실제 DB가 다른 포트에서 실행 중이면 STS4 Run Configurations의 환경 변수를 확인한다.

---

## 2. DB 설계와 Flyway

Flyway 마이그레이션 1~7이 적용되었으며 실행 로그에서 7개 마이그레이션 검증 성공 및 스키마 최신 상태를 확인했다.

```text
V1__create_users.sql
V2__create_boards.sql
V3__create_categories.sql
V4__create_posts.sql
V5__create_comments.sql
V6__create_post_likes.sql
V7__create_attachments.sql
```

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

JPA는 테이블을 자동 생성·수정하지 않고 스키마 검증만 수행한다.

```properties
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
```

이미 적용된 Flyway 마이그레이션 파일을 직접 수정하지 않는다. DB 스키마 변경이 필요하면 새 버전의 마이그레이션 파일을 추가한다.

---

## 3. application.properties 및 민감 정보 관리

주석이 영어로 작성된 설정 파일은 별도로 제공한다.

[Board_Project_application.properties 다운로드](sandbox:/mnt/data/Board_Project_application.properties)

주요 설정:

```properties
spring.datasource.url=jdbc:mariadb://${DB_HOST:localhost}:${DB_PORT:3307}/${DB_NAME:board_db}
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD}

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.open-in-view=false

spring.flyway.enabled=true

jwt.secret=${JWT_SECRET}
jwt.expiration-ms=${JWT_EXPIRATION_MS:3600000}

app.upload.dir=${user.home}/board-project-uploads
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
```

### 비밀번호 로그 노출 주의

이전 Hibernate 시작 로그에 DB 접속 비밀번호가 평문으로 노출된 적이 있다. 해당 비밀번호는 노출된 것으로 간주한다.

1. 아직 변경하지 않았다면 MariaDB 계정 비밀번호를 교체한다.
2. STS4 Run Configurations의 `DB_PASSWORD`도 새 값으로 갱신한다.
3. 실제 비밀번호와 JWT Secret을 소스 코드, README, Markdown, 스크린샷, 콘솔 로그에 기록하지 않는다.
4. 재실행 후 DB 연결 정보가 로그에 노출되지 않는지 확인한다.

`server.error.include-message=always`는 로컬 오류 진단 중에만 임시 사용하고, 진단이 끝나면 비활성화하거나 안전한 오류 응답 정책을 적용한다.

---

## 4. 회원가입·로그인 및 JWT 인증

### 인증 흐름

```text
POST /api/auth/login
        ↓
아이디 및 비밀번호 검증
        ↓
JWT 발급
        ↓
Authorization: Bearer <token>
        ↓
JwtAuthenticationFilter
        ↓
토큰 검증 및 username 확인
        ↓
CustomUserDetailsService로 사용자 조회
        ↓
SecurityContext 인증 등록
        ↓
Controller / Service
```

역할은 `USER`, `ADMIN`이며 Spring Security 권한은 `ROLE_USER`, `ROLE_ADMIN`이다.

주요 구성 요소:
- `JwtTokenProvider`: JWT 발급·검증 및 username 확인
- `JwtAuthenticationFilter`: Bearer Token 추출, 사용자 조회, 인증 등록
- `CustomUserDetailsService`: DB 사용자 정보를 Spring Security 형식으로 변환
- `SecurityConfig`: Stateless 보안 설정 및 경로별 권한 설정
- `PasswordConfig`: BCryptPasswordEncoder 구성

### JWT 필터 디버그 출력

`JwtAuthenticationFilter`의 임시 `System.out.println()` 코드는 다시 사용할 수 있도록 블록 주석으로 비활성화했다. 인증 처리는 유지한다.

- Bearer Token 추출
- 토큰 검증 및 username 확인
- 사용자 정보 조회
- `SecurityContextHolder`에 인증 등록
- 토큰 처리 중 예외 발생 시 SecurityContext 정리
- 필터 체인 계속 진행

---

## 5. Spring Security와 공통 예외 응답

### SecurityConfig

- 세션 정책: Stateless
- JWT API 구성에서 CSRF 비활성화
- 회원가입·로그인은 공개 경로
- `/error`는 공개 경로
- 게시판 생성·수정·삭제 및 카테고리 관리 경로는 기존 규칙에 따라 ADMIN으로 제한
- 나머지 요청은 인증 필요
- `FilterRegistrationBean`을 비활성화해 JWT 필터가 서블릿 필터로 중복 등록되지 않도록 구성

401 및 403 응답을 `ErrorResponse` JSON 형식으로 통일하도록 설정했다.

401 예시:

```json
{
  "code": "UNAUTHORIZED",
  "message": "인증이 필요합니다."
}
```

403 예시:

```json
{
  "code": "FORBIDDEN",
  "message": "접근 권한이 없습니다."
}
```

> `SecurityConfig`에 사용한 JSON 직렬화기 타입과 401·403 결과는 실제 프로젝트에서 컴파일 및 Postman 테스트로 확인한다.

### GlobalExceptionHandler

공통 예외 처리 클래스에서 다음 유형을 다루도록 확장했다.

| 예외 유형 | 목표 HTTP 상태 | 코드 예시 |
|---|---:|---|
| `BusinessException` | 409 | 예외에서 전달한 코드 |
| 로그인 정보 오류 | 401 | `INVALID_CREDENTIALS` |
| 리소스 없음 | 404 | `RESOURCE_NOT_FOUND` |
| Bean Validation 오류 | 400 | `VALIDATION_FAILED` |
| 잘못된 JSON | 400 | `INVALID_REQUEST_BODY` |
| 경로/파라미터 타입 오류 | 400 | `INVALID_PARAMETER` |
| 업로드 용량 초과 | 413 | `FILE_TOO_LARGE` |
| `ResponseStatusException` | 해당 상태 | 상태에 따른 코드 |
| DB 무결성 오류 | 409 | `DATA_INTEGRITY_VIOLATION` |
| 예상하지 못한 예외 | 500 | `INTERNAL_SERVER_ERROR` |

공통 JSON 예시:

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "게시글을 찾을 수 없습니다."
}
```

예상하지 못한 오류는 서버 로그에 원인을 기록하되 클라이언트에 SQL이나 상세 예외를 노출하지 않는 방향이다. `@RestControllerAdvice`만으로 Security 필터 체인의 인증 실패·권한 거부를 모두 처리할 수 없으므로 401은 `AuthenticationEntryPoint`, 403은 `AccessDeniedHandler`에서 처리한다.

---

## 6. 구현 완료: Board

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/boards` | 게시판 목록 |
| GET | `/api/boards/{boardId}` | 게시판 상세 |
| POST | `/api/boards` | 게시판 생성 |
| PUT | `/api/boards/{boardId}` | 게시판 수정 |
| DELETE | `/api/boards/{boardId}` | 게시판 삭제 |

구현 및 테스트:
- 목록·상세 조회
- 존재하지 않는 게시판 `404`
- ADMIN 생성·수정·삭제
- USER 권한 차단 및 JWT 없는 요청 `401`
- 이름 중복 `409`
- Validation 오류 `400`
- 삭제 후 조회 결과 확인

Board CRUD 및 권한·예외 테스트가 완료되었다.

---

## 7. 구현 완료: Category

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/boards/{boardId}/categories` | 게시판별 카테고리 목록 |
| POST | `/api/boards/{boardId}/categories` | 카테고리 생성 |
| PUT | `/api/categories/{categoryId}` | 카테고리 수정 |
| DELETE | `/api/categories/{categoryId}` | 카테고리 삭제 |

Repository의 주요 검증 메서드:

```java
List<Category> findByBoardId(Long boardId);
boolean existsByBoardId(Long boardId);
boolean existsByBoardIdAndName(Long boardId, String name);
boolean existsByBoardIdAndNameAndIdNot(Long boardId, String name, Long categoryId);
```

카테고리 이름은 같은 게시판 내에서 중복되지 않도록 검사한다. 카테고리 CRUD, 인증, 권한, Validation 테스트가 완료되었다.

---

## 8. 구현 완료: Post

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/boards/{boardId}/posts` | 게시판의 삭제되지 않은 게시글 목록 |
| GET | `/api/posts/{postId}` | 게시글 상세 및 조회수 증가 |
| POST | `/api/boards/{boardId}/posts` | 게시글 생성 |
| PUT | `/api/posts/{postId}` | 게시글 수정 |
| DELETE | `/api/posts/{postId}` | 게시글 Soft Delete |

주요 필드:
- 게시판, 선택적 카테고리, 작성자
- 제목, 내용
- `viewCount`, `likeCount`
- 생성·수정 시간, `deletedAt`

DTO:

```text
dto/post/
├── PostCreateRequest.java
├── PostUpdateRequest.java
├── PostResponse.java
└── PostListResponse.java
```

구현 규칙:
- 선택한 카테고리가 해당 게시판에 속하는지 확인
- 작성자 또는 ADMIN만 게시글 수정·삭제 가능
- Soft Delete된 게시글은 일반 조회에서 제외
- 상세 조회 시 조회수 증가
- 제목은 DB 정의에 맞춰 최대 200자로 검증

테스트 완료:
- 생성·목록·상세·수정·삭제
- 존재하지 않는 게시판/게시글
- 조회수 증가
- 카테고리 지정 및 다른 게시판 카테고리 지정 차단
- 작성자/ADMIN 권한
- Soft Delete 및 목록 제외
- Validation 오류 및 JWT 없는 요청

---

## 9. 구현 완료: Comment

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/posts/{postId}/comments` | 댓글 목록 |
| GET | `/api/comments/{commentId}` | 댓글 상세 |
| POST | `/api/posts/{postId}/comments` | 댓글·대댓글 생성 |
| PUT | `/api/comments/{commentId}` | 댓글 수정 |
| DELETE | `/api/comments/{commentId}` | 댓글 Soft Delete |

DTO:

```text
dto/comment/
├── CommentCreateRequest.java
├── CommentUpdateRequest.java
├── CommentResponse.java
└── CommentListResponse.java
```

구현 규칙:
- 댓글 내용 필수, 최대 1,000자
- 부모 댓글은 존재해야 하며 같은 게시글에 속해야 함
- 수정 시 부모 댓글은 변경하지 않음
- 작성자 또는 ADMIN만 수정·삭제 가능
- Soft Delete된 댓글은 일반 목록에서 제외

현재는 부모가 같은 게시글에 있으면 여러 단계의 중첩 답글을 허용한다. 한 단계 대댓글만 허용하도록 요구사항이 정해지면 깊이 검증이 필요하다.

테스트 완료:
- 댓글 생성·목록·상세·대댓글
- 존재하지 않는 부모 댓글 `404`
- 다른 게시글의 부모 댓글 지정 `409`
- 작성자/ADMIN 수정·삭제
- 다른 USER의 수정·삭제 차단
- Soft Delete 및 목록 제외
- 빈 내용·1,000자 초과 검증
- JWT 없는 요청

---

## 10. 구현 완료: PostLike

### DB 구조

```text
post_likes
├── id
├── post_id
├── user_id
└── created_at
```

`(post_id, user_id)`에 UNIQUE 제약 조건이 있으며 `post_id`, `user_id` 인덱스를 사용한다. `updated_at`이 없으므로 `PostLike`는 `BaseEntity`를 상속하지 않는다.

### 구현 파일

```text
entity/PostLike.java
repository/PostLikeRepository.java
dto/postlike/PostLikeResponse.java
service/PostLikeService.java
controller/PostLikeController.java
```

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/posts/{postId}/likes` | 좋아요 수와 사용자 상태 조회 |
| POST | `/api/posts/{postId}/likes` | 좋아요 등록 |
| DELETE | `/api/posts/{postId}/likes` | 좋아요 취소 |

응답 예시:

```json
{
  "postId": 1,
  "likeCount": 5,
  "likedByMe": true
}
```

구현 및 테스트:
- 현재 사용자는 JWT 인증 정보에서 식별
- 중복 좋아요 차단
- 좋아요 내역이 없는 취소 요청은 Not Found
- 존재하지 않거나 삭제된 게시글 처리
- 실제 `post_likes` 레코드 수를 기준으로 `posts.like_count` 동기화
- 사용자가 기능 및 DB 검증 테스트 완료를 확인

동시 요청 경합을 강하게 보장해야 할 경우 UNIQUE 제약 위반 처리, 잠금 또는 원자적 갱신 전략을 추가 검토한다.

---

## 11. 구현 완료: Attachment

### DB 구조

```text
attachments
├── id
├── post_id
├── original_name
├── stored_name
├── file_path
├── file_size
├── content_type
└── created_at
```

- `posts(id)` 외래 키는 `ON DELETE CASCADE`
- `idx_attachments_post` 인덱스 사용
- `updated_at`이 없으므로 `Attachment`는 `BaseEntity`를 상속하지 않음
- `created_at`은 JPA Auditing의 `@CreatedDate`로 기록

### 구현 파일

```text
entity/Attachment.java
repository/AttachmentRepository.java
dto/attachment/AttachmentResponse.java
service/AttachmentService.java
controller/AttachmentController.java
```

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/posts/{postId}/attachments` | 게시글 첨부파일 목록 |
| POST | `/api/posts/{postId}/attachments` | 첨부파일 업로드 |
| GET | `/api/attachments/{attachmentId}/download` | 첨부파일 다운로드 |
| DELETE | `/api/attachments/{attachmentId}` | 첨부파일 삭제 |

### 파일 저장 정책

- 요청 형식: `multipart/form-data`
- 파일 필드명: `file`
- 기본 저장 경로: `${user.home}/board-project-uploads`
- 파일당 크기 제한: 10MB
- UUID로 서버 저장 파일명 생성
- 원본 파일명과 저장 파일명을 분리
- 경로 조작 방지 검증
- 빈 파일 업로드 차단
- 업로드·삭제는 게시글 작성자 또는 ADMIN으로 제한
- 응답에 내부 저장 경로와 저장 파일명을 노출하지 않음

### 성공한 업로드 테스트 응답

첫 시도에서는 0바이트 파일이 전달되어 `400 Bad Request`와 `업로드할 파일을 선택해주세요.` 오류가 발생했다. 내용이 있는 파일을 다시 선택한 뒤 업로드가 성공했다.

```json
{
  "id": 1,
  "postId": 1,
  "originalName": "attachment-test.txt",
  "fileSize": 74,
  "contentType": "text/plain",
  "createdAt": "2026-10-09T18:09:40.6973871",
  "downloadUrl": "/api/attachments/1/download"
}
```

이후 사용자는 첨부파일 업로드·조회·삭제 테스트를 완료했다고 확인했다.

### 추가 검토 사항

- `content_type`은 클라이언트가 보낸 값으로 실제 파일 형식을 보증하지 않는다.
- 확장자 허용 목록과 파일 시그니처 검사는 아직 적용되지 않았다.
- 파일 시스템과 DB는 단일 원자적 트랜잭션이 아니다.
- 현재 다운로드 서비스는 게시글의 활성 상태를 확인하지만 작성자/ADMIN만 다운로드하도록 제한하지는 않는다.
- 파일 유형 정책과 다운로드 권한은 운영 전에 확정해야 한다.

---

## 12. 현재 진행 현황

```text
회원가입 / 로그인           ✅
JWT / Spring Security       ✅
Board CRUD                  ✅
Category CRUD               ✅
Post CRUD                   ✅
Comment / 대댓글             ✅
PostLike                    ✅
Attachment                  ✅

GlobalExceptionHandler 정리 ✅ 수정 및 테스트 완료
SecurityConfig의 401/403    ✅ 응답 형식 통일 작업 진행
JWT Filter 디버그 출력 정리 ✅ 출력 구문 주석 처리
DB 비밀번호 및 로그 점검     ⬜ 교체 및 재검증 필요
첨부파일 다운로드 권한 확정  ⬜
페이징 / 정렬 / 검색         ⬜
통합 테스트                  ⬜
React 프론트엔드             ⬜
Docker                      ⬜
GitHub Actions CI/CD        ⬜
배포                        ⬜
```

> 401·403 응답 형식을 통일하는 코드는 제안 및 적용 단계로 정리했다. 실제 Postman 검증이 아직 별도로 확인되지 않았다면 완료 상태로 확정하기 전에 테스트한다.

---

## 13. 다음 작업 권장 순서

1. 이전 로그에서 노출된 DB 비밀번호를 교체하고 STS4의 `DB_PASSWORD`를 갱신한다.
2. 애플리케이션을 재실행해 DB 연결 정보가 로그에 노출되지 않는지 확인한다.
3. SecurityConfig의 401·403 JSON 응답을 Postman으로 확인한다.
4. 첨부파일 다운로드 권한 정책을 결정하고 필요한 경우 접근 검사를 추가한다.
5. 파일 크기·빈 파일·파일명·경로·파일 유형 검증을 재점검한다.
6. 게시글 목록에 페이징·정렬·검색을 구현한다.
7. React 프론트엔드를 백엔드 API와 연동한다.
8. Docker 및 GitHub Actions CI/CD를 구성한다.
9. 배포 환경에 적용한다.

이 문서는 현재까지 구현한 백엔드 기능과 남은 작업을 기록한 기준 문서다. 이후 기능이 완료될 때마다 문서를 갱신한다.
