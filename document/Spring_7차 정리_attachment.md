# Board Project 백엔드 진행 문서 (Attachment까지)

## 1. 프로젝트 개요

이 문서는 회원 인증부터 게시글 첨부파일(Attachment) 기능까지 구현한 백엔드 진행 상황을 정리한다.

### 프로젝트 폴더 구조

```text
Board_Project/
├── db/
├── back/
├── front/
├── .github/
├── README.md
└── PROJECT_PLAN.md
```

### 사용 기술

- Java 21
- Spring Boot 4.1.1
- Spring Web
- Spring Data JPA
- Hibernate ORM 7.4.5
- MariaDB 10.6
- Flyway
- Spring Security
- JWT (JJWT 0.13.0)
- Bean Validation
- Maven
- STS4

### 데이터베이스 연결 환경

- 데이터베이스: `board_db`
- 호스트: `localhost`
- 개발 환경 포트: `3307`
- 사용자: `root`
- 비밀번호는 환경 변수로 관리하며 소스 코드나 로그에 포함하지 않는다.

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

---

## 2. 데이터베이스 마이그레이션 및 JPA 설정

Flyway 마이그레이션 `V1`부터 `V7`까지 검증 및 적용이 완료되었다.

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

JPA는 DB 스키마를 자동 변경하지 않고 검증만 수행하도록 설정되어 있다.

```properties
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
```

이미 적용된 Flyway 마이그레이션 파일은 직접 수정하지 않는다. 스키마 변경이 필요하면 새 버전의 마이그레이션 파일을 추가한다.

---

## 3. application.properties 설정

별도로 제공된 한글 주석이 아닌 영어 주석 버전의 설정 파일:

[application.properties 다운로드](sandbox:/mnt/data/Board_Project_application.properties)

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

### 로그 및 민감 정보

이전 실행 로그에서 Hibernate 연결 정보에 DB 비밀번호가 평문으로 표시된 적이 있다. 해당 비밀번호는 노출된 것으로 보고 다음 조치를 해야 한다.

1. MariaDB 계정 비밀번호를 변경한다.
2. STS4의 `Run Configurations` 환경 변수 `DB_PASSWORD`를 새 값으로 변경한다.
3. 소스 코드, README, 스크린샷, 콘솔 로그에 실제 비밀번호를 남기지 않는다.
4. 애플리케이션을 재실행한 뒤 DB 접속 정보가 로그에 노출되지 않는지 확인한다.

SQL 및 DB 연결 상세 로그를 줄이기 위해 설정 파일에는 Hibernate 로그 레벨 설정이 추가되어 있다.

개발 중 원인 분석을 위해 `server.error.include-message=always`를 사용했다면 진단이 끝난 후 운영 설정에서는 비활성화하거나 안전한 오류 응답 정책을 적용한다.

---

## 4. 회원 인증 및 권한

### JWT 인증 흐름

```text
POST /api/auth/login
        ↓
아이디 및 비밀번호 검증
        ↓
JWT 발급
        ↓
클라이언트가 Authorization: Bearer <token> 전달
        ↓
JwtAuthenticationFilter에서 토큰 검증
        ↓
사용자 정보 조회
        ↓
SecurityContext에 인증 등록
        ↓
Controller / Service 실행
```

### 역할

```text
USER
ADMIN
```

Spring Security의 권한 이름은 `ROLE_USER`, `ROLE_ADMIN`이다.

### JwtAuthenticationFilter 정리

`JwtAuthenticationFilter`의 임시 `System.out.println()` 디버그 코드는 나중에 다시 사용할 수 있도록 주석 처리했다. 인증 처리를 수행하는 코드는 그대로 유지했다.

실제 동작은 다음과 같다.

- `Bearer` 토큰 추출
- JWT 검증 및 username 확인
- 사용자 상세 정보 조회
- `SecurityContextHolder`에 인증 등록
- 토큰 처리 중 오류가 발생하면 SecurityContext 정리
- 필터 체인 계속 진행

디버그 출력은 주석 처리했으며 인증 로직 자체를 비활성화한 것은 아니다.

### 보안 구성 관련 사항

- 세션 정책은 Stateless로 설정
- JWT API 구성에서 CSRF 비활성화
- 회원가입 및 로그인 API는 인증 없이 접근 가능
- 게시판 및 카테고리 관리 API는 설정된 경로 규칙에 따라 ADMIN으로 제한
- 나머지 API는 인증 필요
- `FilterRegistrationBean`을 비활성화해 JWT 필터가 서블릿 필터와 Spring Security 체인에 중복 등록되지 않도록 함

---

## 5. 구현 완료: Board

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/boards` | 게시판 목록 조회 |
| GET | `/api/boards/{boardId}` | 게시판 상세 조회 |
| POST | `/api/boards` | 게시판 생성 |
| PUT | `/api/boards/{boardId}` | 게시판 수정 |
| DELETE | `/api/boards/{boardId}` | 게시판 삭제 |

### 구현 및 테스트

- 게시판 목록 및 상세 조회
- 존재하지 않는 게시판 `404`
- ADMIN 생성·수정·삭제
- 일반 USER 권한 차단
- JWT 없는 요청 `401`
- 게시판 이름 중복 `409`
- Validation 오류 `400`
- 삭제 후 조회 결과 확인

생성·수정·삭제의 권한 및 예외 처리를 테스트했다.

---

## 6. 구현 완료: Category

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/boards/{boardId}/categories` | 게시판별 카테고리 목록 조회 |
| POST | `/api/boards/{boardId}/categories` | 카테고리 생성 |
| PUT | `/api/categories/{categoryId}` | 카테고리 수정 |
| DELETE | `/api/categories/{categoryId}` | 카테고리 삭제 |

### Repository 검증 메서드

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

### 구현 및 테스트

- 게시판 내 카테고리 이름 중복 검사
- 카테고리 생성·목록·수정·삭제
- 인증 및 ADMIN 권한 검증
- Validation 검증

---

## 7. 구현 완료: Post

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/boards/{boardId}/posts` | 게시판의 삭제되지 않은 게시글 목록 조회 |
| GET | `/api/posts/{postId}` | 게시글 상세 조회 및 조회수 증가 |
| POST | `/api/boards/{boardId}/posts` | 게시글 생성 |
| PUT | `/api/posts/{postId}` | 게시글 수정 |
| DELETE | `/api/posts/{postId}` | 게시글 Soft Delete |

### 주요 필드

- `board`
- 선택적 `category`
- `user`
- `title`
- `content`
- `viewCount`
- `likeCount`
- `createdAt`
- `updatedAt`
- `deletedAt`

### DTO

```text
dto/post/
├── PostCreateRequest.java
├── PostUpdateRequest.java
├── PostResponse.java
└── PostListResponse.java
```

### 동작 및 검증

- 선택한 카테고리가 해당 게시판에 속하는지 확인
- 작성자 또는 ADMIN만 게시글 수정·삭제 가능
- Soft Delete된 게시글은 일반 조회에서 제외
- 상세 조회 시 조회수 증가
- 제목은 DB 정의에 맞춰 최대 200자로 검증

### 테스트 완료 항목

- 게시글 생성·목록·상세·수정·삭제
- 존재하지 않는 게시판/게시글
- 조회수 증가
- 카테고리 지정 및 다른 게시판 카테고리 지정 차단
- 작성자/ADMIN 권한 확인
- Soft Delete 및 목록 제외
- Validation 및 JWT 없는 요청

---

## 8. 구현 완료: Comment

### API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/posts/{postId}/comments` | 댓글 목록 조회 |
| GET | `/api/comments/{commentId}` | 댓글 상세 조회 |
| POST | `/api/posts/{postId}/comments` | 댓글 또는 대댓글 생성 |
| PUT | `/api/comments/{commentId}` | 댓글 수정 |
| DELETE | `/api/comments/{commentId}` | 댓글 Soft Delete |

### Entity 주요 필드

- `post`
- `user`
- 선택적 자기 참조 `parent`
- `content`
- `createdAt`
- `updatedAt`
- `deletedAt`

### DTO

```text
dto/comment/
├── CommentCreateRequest.java
├── CommentUpdateRequest.java
├── CommentResponse.java
└── CommentListResponse.java
```

### 구현 규칙

- 댓글 내용 필수, 최대 1,000자
- 대댓글의 부모 댓글이 존재하는지 확인
- 부모 댓글은 같은 게시글에 속해야 함
- 수정 시 부모 댓글은 변경하지 않음
- 작성자 또는 ADMIN만 수정·삭제 가능
- 삭제는 Soft Delete이며 일반 목록에서 제외

현재 구현은 부모 댓글이 같은 게시글에 속하면 여러 단계의 중첩 답글을 허용한다. 한 단계 대댓글만 허용하도록 요구사항이 바뀌면 깊이 검증 로직을 추가한다.

### 테스트 완료 항목

- 댓글 생성·목록·상세·대댓글
- 존재하지 않는 부모 댓글 `404`
- 다른 게시글의 부모 댓글 지정 `409`
- 작성자/ADMIN 수정 및 삭제
- 다른 USER의 수정·삭제 차단
- Soft Delete 및 목록 제외
- 빈 내용 및 1,000자 초과 검증
- JWT 없는 요청

---

## 9. 구현 완료: PostLike

### DB 구조

```text
post_likes
├── id
├── post_id
├── user_id
└── created_at
```

`(post_id, user_id)`에 UNIQUE 제약 조건이 있으며 `post_id`, `user_id` 인덱스가 있다. `updated_at` 컬럼이 없으므로 `PostLike`는 `BaseEntity`를 상속하지 않는다.

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
| GET | `/api/posts/{postId}/likes` | 좋아요 수와 내 좋아요 여부 조회 |
| POST | `/api/posts/{postId}/likes` | 좋아요 등록 |
| DELETE | `/api/posts/{postId}/likes` | 현재 사용자의 좋아요 취소 |

응답 예시:

```json
{
  "postId": 1,
  "likeCount": 5,
  "likedByMe": true
}
```

### 구현 및 테스트

- 현재 사용자 ID는 요청에서 직접 받지 않고 JWT 인증 정보에서 가져옴
- 중복 좋아요 차단
- 좋아요 내역이 없는 경우 취소 요청은 Not Found 처리
- 삭제되거나 존재하지 않는 게시글은 처리하지 않음
- `post_likes`의 실제 레코드 수를 기준으로 `posts.like_count` 동기화
- 사용자가 API 및 DB 확인 테스트 완료를 보고함

동시 요청에서는 사전 중복 확인 사이에 경합이 발생할 수 있다. 동시성 요구가 커지면 UNIQUE 제약 조건 위반 처리, 잠금 또는 원자적 갱신 전략을 추가로 검토한다.

---

## 10. 구현 완료: Attachment

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

- `posts(id)`를 참조하는 외래 키는 `ON DELETE CASCADE`
- `idx_attachments_post` 인덱스 사용
- `updated_at`이 없으므로 `BaseEntity`를 상속하지 않음
- `created_at`은 `@CreatedDate`와 JPA Auditing으로 기록

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
| GET | `/api/posts/{postId}/attachments` | 게시글 첨부파일 목록 조회 |
| POST | `/api/posts/{postId}/attachments` | 첨부파일 업로드 |
| GET | `/api/attachments/{attachmentId}/download` | 첨부파일 다운로드 |
| DELETE | `/api/attachments/{attachmentId}` | 첨부파일 삭제 |

### 파일 저장 및 검증 정책

- 요청 형식: `multipart/form-data`
- 파일 필드명: `file`
- 기본 저장 경로: `${user.home}/board-project-uploads`
- 최대 파일 크기: 10MB
- 저장 파일명은 UUID로 생성
- 원본 파일명과 서버 저장 파일명을 분리
- 경로 조작 방지 검증 적용
- 빈 파일 업로드 차단
- 업로드 및 삭제는 게시글 작성자 또는 ADMIN으로 제한
- 응답에 내부 저장 경로 및 저장 파일명 노출하지 않음

### 실제 업로드 테스트 응답

처음에는 0바이트 파일이 전달되어 `400 Bad Request`와 `업로드할 파일을 선택해주세요.` 오류가 발생했다. 내용이 있는 테스트 파일을 다시 선택한 후 업로드가 성공했다.

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

사용자는 이후 업로드, 조회, 삭제 테스트를 완료했다고 확인했다.

### 추가 검토가 필요한 부분

- 현재 `content_type`은 클라이언트가 제공한 값이며 실제 파일 형식을 보증하지 않는다.
- 확장자 허용 목록 또는 파일 시그니처 검사는 아직 적용되어 있지 않다.
- 파일 시스템과 DB는 하나의 원자적 트랜잭션이 아니다.
- 현재 다운로드 서비스는 게시글의 활성 상태를 확인하지만 작성자/ADMIN만 다운로드하도록 제한하지는 않는다. 프로젝트의 공개 정책에 따라 접근 권한을 확정해야 한다.
- 운영 배포 전에 파일 유형 검증, 오류 처리, 삭제 실패 시 정합성 처리 등을 검토한다.

---

## 11. 현재 백엔드 진행 현황

```text
회원가입 / 로그인           ✅
JWT / Spring Security       ✅
Board CRUD                  ✅
Category CRUD               ✅
Post CRUD                   ✅
Comment / 대댓글             ✅
PostLike                    ✅
Attachment                  ✅

공통 예외 처리 점검           ⬜
JWT Filter 디버그 출력 정리  ✅ (출력 구문 주석 처리)
DB 비밀번호 및 로그 점검      ⬜ 변경 및 재검증 필요
첨부파일 다운로드 권한 확정   ⬜
페이징 / 정렬                ⬜
검색                         ⬜
통합 테스트                  ⬜
React 프론트엔드              ⬜
Docker                       ⬜
GitHub Actions CI/CD         ⬜
배포                         ⬜
```

---

## 12. 권장 다음 작업

1. 이전 로그에서 노출된 DB 비밀번호를 변경하고 STS4의 `DB_PASSWORD` 환경 변수도 갱신한다.
2. 애플리케이션을 재실행해 DB 연결 정보가 로그에 노출되지 않는지 확인한다.
3. 공통 예외 처리 클래스에서 HTTP 상태 코드와 응답 형식을 점검한다.
4. 첨부파일 다운로드 권한 정책을 결정하고 필요한 경우 접근 검사를 추가한다.
5. 파일 크기, 빈 파일, 파일명, 경로, 파일 유형 검증을 재점검한다.
6. 게시글 목록에 페이징·정렬·검색을 추가한다.
7. React 프론트엔드와 백엔드 API를 연동한다.
8. Docker 및 GitHub Actions CI/CD를 구성한다.
9. 배포 환경에 적용한다.

이 문서는 Attachment 기능까지 완료한 시점의 구현 현황과 알려진 후속 작업을 기록한다. 이후 작업이 완료될 때마다 문서를 갱신한다.
