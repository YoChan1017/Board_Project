# Board Project Backend - PostLike 완료 문서

## 1. 작업 상태

**PostLike(게시글 좋아요) 구현 및 테스트 완료**

기존 Spring Boot 게시판 백엔드 구조와 MariaDB 스키마를 유지해 구현했다.

- Java 21
- Spring Boot 4.1.1
- Spring Data JPA
- MariaDB
- Spring Security + JWT
- JJWT 0.13.0

---

## 2. DB 구조

테이블: `post_likes`

| 컬럼 | 설명 |
|---|---|
| `id` | 좋아요 ID, PK |
| `post_id` | 좋아요 대상 게시글 |
| `user_id` | 좋아요를 누른 사용자 |
| `created_at` | 좋아요 생성 시간 |

제약 조건과 인덱스:

```sql
CONSTRAINT uq_post_likes_post_user UNIQUE (post_id, user_id)
```

- 동일한 사용자가 같은 게시글에 중복으로 좋아요를 등록하지 못하도록 UNIQUE 제약 조건을 둔다.
- `post_id`, `user_id` 인덱스로 조회를 지원한다.
- `post_likes`에는 `updated_at`이 없으므로 `PostLike`는 `BaseEntity`를 상속하지 않는다.
- `created_at`은 `@CreationTimestamp`를 이용해 생성 시 기록한다.
- Flyway 마이그레이션 파일 `V6__create_post_likes.sql`은 이미 적용된 파일이므로 수정하지 않는다.

엔티티의 UNIQUE 제약 조건 이름은 SQL과 동일하게 `uq_post_likes_post_user`로 맞춘다.

---

## 3. 구현 파일

```text
com.example.board
├── entity/
│   └── PostLike.java
├── repository/
│   └── PostLikeRepository.java
├── dto/
│   └── postlike/
│       └── PostLikeResponse.java
├── service/
│   └── PostLikeService.java
└── controller/
    └── PostLikeController.java
```

### PostLikeRepository

핵심 메서드:

```java
Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);

boolean existsByPostIdAndUserId(Long postId, Long userId);

long countByPostId(Long postId);
```

역할:

- 게시글과 사용자로 좋아요 내역 조회
- 중복 좋아요 여부 확인
- 게시글의 좋아요 개수 계산

### PostLikeResponse

응답 필드:

```text
postId
likeCount
likedByMe
```

응답 예시:

```json
{
  "postId": 1,
  "likeCount": 5,
  "likedByMe": true
}
```

`likedByMe`는 현재 인증된 사용자가 해당 게시글에 좋아요를 등록했는지를 나타낸다.

---

## 4. API

| Method | Endpoint | 성공 응답 | 설명 |
|---|---|---|---|
| GET | `/api/posts/{postId}/likes` | `200 OK` | 좋아요 수 및 현재 사용자 상태 조회 |
| POST | `/api/posts/{postId}/likes` | `201 Created` | 좋아요 등록 |
| DELETE | `/api/posts/{postId}/likes` | `200 OK` | 좋아요 취소 |

모든 API는 JWT 인증이 필요하다. 사용자 ID를 요청 본문이나 URL에서 전달받지 않고, 인증 객체의 username으로 현재 사용자를 식별한다.

### 좋아요 등록

1. 삭제되지 않은 게시글인지 확인한다.
2. 로그인한 사용자를 조회한다.
3. 해당 게시글에 이미 좋아요를 눌렀는지 확인한다.
4. 좋아요 엔티티를 저장한다.
5. DB의 실제 좋아요 레코드 수를 계산해 `posts.like_count`에 반영한다.

중복 등록은 `BusinessException`의 코드 `POST_LIKE_ALREADY_EXISTS`로 처리하며, 공통 예외 처리 설정에 따라 `409 Conflict`를 반환하도록 구성한다.

### 좋아요 취소

1. 삭제되지 않은 게시글인지 확인한다.
2. 로그인한 사용자를 조회한다.
3. 해당 사용자의 좋아요 내역을 조회한다.
4. 좋아요를 삭제한다.
5. 남은 좋아요 레코드 수를 계산해 `posts.like_count`에 반영한다.

해당 사용자의 좋아요 내역이 없으면 `ResourceNotFoundException`으로 처리한다.

### 좋아요 조회

1. 삭제되지 않은 게시글인지 확인한다.
2. 현재 사용자의 좋아요 여부를 확인한다.
3. 좋아요 수와 사용자별 좋아요 여부를 반환한다.

---

## 5. 테스트 결과

사용자가 Postman 테스트를 완료했다.

| 테스트 | 결과 |
|---|---|
| 좋아요 상태 조회 | ✅ 완료 |
| 좋아요 등록 | ✅ 완료 |
| 중복 좋아요 차단 | ✅ 완료 |
| 좋아요 개수 증가 확인 | ✅ 완료 |
| 등록 이후 좋아요 상태 확인 | ✅ 완료 |
| 좋아요 취소 | ✅ 완료 |
| 취소 이후 좋아요 개수 감소 확인 | ✅ 완료 |
| 이미 취소된 좋아요 재취소 | ✅ 완료 |
| JWT 없는 요청 확인 | ✅ 완료 |
| 존재하지 않는 게시글 확인 | ✅ 완료 |
| 삭제된 게시글 확인 | ✅ 완료 |
| 다른 사용자의 좋아요 상태 확인 | ✅ 완료 |
| MariaDB `post_likes` 확인 | ✅ 완료 |
| `posts.like_count`와 실제 좋아요 수 비교 | ✅ 완료 |

> 상세 HTTP 응답 코드와 개별 응답 본문은 이 문서 작성 시점에 별도로 전달되지 않았으므로, 위 표는 테스트를 완료했다는 사용자의 확인을 기록한 것이다.

---

## 6. 구현상 주의사항

- DB의 UNIQUE 제약 조건은 중복 데이터가 저장되는 것을 최종적으로 방지한다.
- Service에서 먼저 중복 여부를 조회하는 방식만으로는 여러 요청이 동시에 들어오는 경합 상황을 완전히 막을 수 없다. 동시성까지 보장하려면 DB 제약 조건 위반에 대한 별도 예외 처리 또는 적절한 잠금/원자적 갱신 전략을 추가 검토해야 한다.
- `like_count`는 `post_likes`에서 계산한 실제 레코드 수로 동기화한다. 여러 동시 요청까지 고려한 강한 정합성이 필요해지면 트랜잭션 격리, 잠금 또는 원자적 갱신을 검토한다.
- 일반 사용자의 조회는 인증된 사용자의 `likedByMe` 상태를 반환한다.
- 삭제된 게시글은 좋아요 API에서 조회되지 않도록 한다.

---

## 7. 백엔드 진행 현황

```text
User / 회원가입·로그인       ✅
JWT / Spring Security       ✅
Board CRUD                 ✅
Category CRUD              ✅
Post CRUD                  ✅
Comment CRUD / 대댓글       ✅
PostLike                   ✅

Attachment                 ⬜ 다음 작업
공통 예외 및 보안 정리       ⬜
페이징 / 정렬 / 검색         ⬜
통합 테스트                 ⬜
React Frontend              ⬜
Docker                      ⬜
GitHub Actions CI/CD        ⬜
배포                        ⬜
```

---

## 8. 다음 작업 - Attachment

다음 구현 대상은 게시글 첨부파일이다.

DB 컬럼:

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

권장 진행 순서:

1. `Attachment.java` 및 `V7__create_attachments.sql` 확인
2. `AttachmentRepository`
3. 업로드/응답 DTO
4. 파일 저장 위치와 허용 파일 크기·유형 정책 결정
5. `AttachmentService`
6. `AttachmentController`
7. 업로드·목록 조회·삭제 테스트
8. DB와 실제 저장 파일 검증
9. Markdown 문서 갱신

파일 업로드를 구현하기 전에 파일 저장 경로, 허용 크기, 허용 유형, 게시글 삭제 시 첨부파일 처리 정책을 확인한다.
