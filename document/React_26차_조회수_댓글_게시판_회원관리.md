# 26차 — 조회수 중복 증가, 삭제 댓글 표시, 게시판 목록, 관리자 회원 관리

## 목표 및 DB 영향

이 작업에서 필요한 기존 스키마 변경은 없습니다.

- **조회수:** `posts.view_count` 기존 컬럼을 사용합니다. GET 상세 조회와 조회수 증가를 분리하고 원자적 UPDATE로 증가량을 보장합니다.
- **삭제 댓글:** 기존 `comments.deleted_at` 소프트 삭제 컬럼과 `parent_id` 관계를 사용합니다. 삭제 댓글도 목록 결과에 남기고 내용만 안내 문구로 바꿉니다.
- **게시판 목록:** 프런트엔드 라우팅과 화면만 변경합니다.
- **관리자 회원 관리:** 기존 `users` 테이블의 계정 필드와 `deleted_at`을 읽습니다. 비밀번호·JWT 내부값은 응답하지 않습니다.

데이터베이스를 삭제하거나 재생성하지 않습니다. 신규 Flyway migration도 추가하지 않았습니다.

## 포함된 파일

### 기존 경로에 복사할 프런트엔드 파일

- `front/src/App.jsx` — 게시판 목록/게시글 라우트와 회원 관리 라우트를 등록합니다.
- `front/src/components/AppLayout.jsx` — “게시판 목록”, 관리자 전용 “회원 관리” 메뉴를 표시합니다.
- `front/src/pages/BoardDirectoryPage.jsx` — 게시판 카드 목록 및 이름/설명 검색
- `front/src/pages/BoardPostsPage.jsx` — 선택 게시판의 글 목록, 제목/본문 검색, 페이지 이동
- `front/src/api/adminUserApi.js` — 관리자 회원 목록 API
- `front/src/pages/AdminUsersPage.jsx` — 회원 목록, 검색, 권한·계정 상태 필터
- `front/src/App.css` — 기존 CSS에 추가할 스타일 조각

### 기존 경로에 복사할 백엔드 파일

- `back/src/main/java/com/example/board/controller/AdminUserController.java`
- `back/src/main/java/com/example/board/service/AdminUserService.java`
- `back/src/main/java/com/example/board/dto/admin/AdminUserResponse.java`

회원 관리 API는 `GET /api/admin/users`입니다. 컨트롤러에 `@PreAuthorize("hasRole('ADMIN')")`를 적용했습니다. 프로젝트의 Security 설정에 `@EnableMethodSecurity`가 활성화되어 있는지 확인하세요. 이미 활성화되어 있으면 별도 설정 수정은 필요 없습니다. 활성화되어 있지 않다면 기존의 관리자 전용 API와 같은 방식으로 method security를 활성화하거나 `SecurityConfig`의 `/api/admin/**` 권한 규칙에 관리자 접근 제한을 넣어야 합니다.

## A. 조회수 2회 증가 문제 — 기존 DB 컬럼만 사용

원인은 상세 페이지의 React 개발 모드 `StrictMode`가 effect 실행을 재확인하는데, 상세 조회 GET 요청 자체가 조회수를 증가시키는 부수 효과까지 수행하는 구조일 가능성이 큽니다. 요청 로그에서 `GET /api/posts/{postId}`가 페이지 진입 한 번에 두 번 발생하는지 먼저 확인하세요.

중복 조회 요청과 조회수 변경을 분리하는 방향을 권장합니다.

### 1. PostRepository에 원자적 증가 쿼리 추가

`PostRepository.java`의 기존 선언을 유지하고 다음 메서드를 추가합니다. import가 없으면 `Modifying`, `Query`, `Param`을 추가하세요.

```java
@Modifying(clearAutomatically = true, flushAutomatically = true)
@Query("update Post p set p.viewCount = p.viewCount + 1 where p.id = :postId and p.deletedAt is null")
int incrementViewCount(@Param("postId") Long postId);
```

이 JPQL의 `Post`, `viewCount`, `deletedAt`은 프로젝트 엔티티의 실제 클래스/프로퍼티 이름과 맞는지 확인합니다. 현재 API/DB 문서에서는 해당 필드를 사용합니다.

### 2. PostService 분리

- 기존 `findById`/상세 조회 메서드에서 `setViewCount(viewCount + 1)`을 제거합니다. 이 메서드는 게시글을 읽기만 해야 합니다.
- 다음 메서드를 추가합니다. `ResourceNotFoundException`의 생성자 형식은 프로젝트의 기존 사용법에 맞춥니다.

```java
@Transactional
public void incrementViewCount(Long postId) {
    int updated = postRepository.incrementViewCount(postId);
    if (updated == 0) {
        throw new ResourceNotFoundException("게시글을 찾을 수 없습니다.");
    }
}
```

- 파일 상단에 `org.springframework.transaction.annotation.Transactional`이 없으면 import 합니다.

### 3. PostController에 전용 API 추가

현재 컨트롤러가 `@RequestMapping("/api/posts")`를 사용한다면 그 클래스 안에 추가합니다. 이미 다른 base path를 사용한다면 API 최종 경로가 `POST /api/posts/{postId}/view`가 되도록 맞춥니다.

```java
@PostMapping("/{postId}/view")
public ResponseEntity<Void> incrementViewCount(@PathVariable Long postId) {
    postService.incrementViewCount(postId);
    return ResponseEntity.noContent().build();
}
```

### 4. 프런트 상세 페이지의 API 메서드 및 effect

상세 페이지에서 사용하는 기존 API 모듈에 다음 함수를 추가합니다. `apiClient`의 base URL이 `/api`인 현재 프로젝트 구조를 전제로 한 경로입니다.

```javascript
async incrementViewCount(postId) {
  await apiClient.post(`/posts/${postId}/view`)
}
```

상세 페이지에서 `useRef`를 import한 후, 기존 게시글 로드 effect와 **별도**로 조회수 증가 effect를 둡니다. 기존 API 객체 이름은 실제 파일의 이름으로 맞춥니다.

```jsx
const countedPostIdRef = useRef(null)

useEffect(() => {
  const id = String(postId ?? '')
  if (!id || countedPostIdRef.current === id) return

  // React StrictMode의 effect 재실행에서 같은 게시글을 두 번 집계하지 않습니다.
  countedPostIdRef.current = id
  postApi.incrementViewCount(id)
    .then(() => postApi.getPost(id))
    .then((updatedPost) => setPost(updatedPost))
    .catch((requestError) => {
      // 조회수 기록 실패가 게시글 상세 화면 자체를 막지는 않도록 합니다.
      console.error('조회수 기록에 실패했습니다.', requestError)
    })
}, [postId])
```

`postApi`, `getPost`, `setPost`는 현재 `PostDetailPage`의 실제 변수/함수명으로 치환합니다. 위의 재조회는 POST 증가 이후 화면의 조회수를 최신 값으로 갱신하기 위한 것입니다. 기존 GET 상세 조회에 조회수 증가 로직이 남아 있으면 두 경로에서 증가하므로 반드시 제거합니다.

### 조회수 수동 검증

1. 기존 게시글 조회수를 기록합니다.
2. 개발 서버에서 게시글 상세 화면에 한 번 진입합니다. 증가량이 `+1`인지 확인합니다.
3. 브라우저 새로고침을 한 번 합니다. 새 페이지 진입당 `+1`만 증가하는지 확인합니다.
4. 브라우저 Network 탭에서 상세 GET이 두 번 나가더라도 GET 자체가 카운트를 증가시키지 않는지 확인합니다.
5. 동시에 여러 번 요청해도 `view_count`가 덮어써지지 않고 누적되는지 확인합니다.

---

## B. 삭제 댓글은 흔적을 남기고 대댓글 유지 — 기존 컬럼 사용

`comments.deleted_at`과 `parent_id`를 사용하면 DB 마이그레이션 없이 처리할 수 있습니다.

### 1. 댓글 목록 조회에서 삭제 댓글을 제외하지 않기

`CommentService`의 게시글 댓글 목록 메서드를 찾습니다. 현재 쿼리가 `deletedAt is null` 조건으로 댓글을 제외한다면, 해당 목록 조회에서 그 조건을 제거하여 **게시글에 속한 댓글을 삭제 여부와 관계없이 작성일 오름차순으로** 조회하도록 변경합니다. 관리자/일반 사용자용 댓글 목록 정책을 별도로 둔 경우에도 화면에 필요한 댓글 트리 조회는 삭제 댓글을 포함해야 합니다.

중요: 삭제 댓글을 결과에서 제거하면 그 댓글을 부모로 가진 대댓글이 UI 트리 구성 과정에서 고아 댓글처럼 사라질 수 있습니다. 부모 댓글의 행을 유지하는 것이 핵심입니다.

### 2. 응답 DTO에서 원래 내용 숨기기

`CommentResponse`(또는 댓글 JSON 응답 DTO)에 `deleted` boolean 필드를 추가하고, 생성자에서 `comment.getDeletedAt() != null`을 확인합니다.

```java
this.deleted = comment.getDeletedAt() != null;
this.content = this.deleted ? "삭제된 댓글입니다." : comment.getContent();
```

이 예시의 `content` 대입은 DTO가 기존에 `comment.getContent()`로 값을 받는 지점에 적용합니다. 실제 댓글 내용 getter가 다르면 그 이름을 사용합니다. `isDeleted()` 또는 `getDeleted()` getter를 추가해 JSON 응답에 `deleted`가 포함되게 합니다. 삭제된 댓글의 원문은 API 응답에 절대 포함하지 않아야 합니다.

### 3. 프런트 댓글 트리 렌더링

- 댓글 배열을 만들 때 `deleted` 댓글도 필터링하지 않습니다.
- `parentId` 기준으로 대댓글을 붙이는 로직은 그대로 유지합니다.
- 내용은 DTO에서 받은 `삭제된 댓글입니다.` 문구를 렌더링합니다.
- `comment.deleted === true`인 행에는 수정/삭제 버튼을 숨깁니다. 대댓글은 기존처럼 부모 댓글 아래 표시합니다. 대댓글 작성 정책은 현재 기능을 유지합니다.
- 삭제된 댓글의 작성자명/내용을 추가로 표시할 필요가 없다면, 작성자명도 `탈퇴회원` 또는 일반적인 익명 표시로 처리할 수 있습니다. 기존 계정 탈퇴 처리에서 이미 닉네임이 비식별화되는지 확인하세요.

### 삭제 댓글 수동 검증

1. 댓글 A에 대댓글 B와 그 아래 대댓글 C를 작성합니다.
2. 댓글 A를 삭제합니다.
3. A 위치에 `삭제된 댓글입니다.`가 보이는지 확인합니다.
4. B와 C가 계층과 순서를 유지하고 사라지지 않는지 확인합니다.
5. 삭제된 A의 원문이 Network 응답 JSON에도 없는지 확인합니다.
6. 삭제된 댓글에는 수정/삭제 버튼이 표시되지 않는지 확인합니다.

---

## C. 게시판 목록 구조

`/boards`를 게시판 디렉터리로 사용합니다. 게시판이 여러 개일 때 상단의 개별 탭 대신 카드형 목록에서 게시판을 검색·선택하고, 선택 후 `/boards/{boardId}/posts`에서 해당 게시판의 게시글 목록을 확인하도록 했습니다.

- 새 DB 구조나 마이그레이션은 필요 없습니다.
- 새 게시글 작성은 기존 `/boards/{boardId}/posts/new` 경로를 사용합니다.
- 게시글 상세는 기존 `/posts/{postId}` 경로를 사용합니다.

수동 검증: 게시판 1개 이상 등록 → `/boards`에서 각 카드를 확인 → 게시글 보기 → 검색/페이지 이동 → 글쓰기 → 목록/상세 이동을 확인합니다.

---

## D. 관리자 회원 관리

`GET /api/admin/users`는 최신 가입 계정부터 반환하며 `userId`, `username`, `nickname`, `email`, `role`, `createdAt`, `updatedAt`, `deletedAt`만 응답합니다. password 해시와 token version은 반환하지 않습니다. 프런트는 검색과 권한·상태 필터를 제공합니다.

현재 구현은 **조회 전용 회원 관리 페이지**입니다. 계정 권한 변경이나 강제 탈퇴는 실수로 권한을 잃거나 계정이 삭제되는 위험이 있어 추가하지 않았습니다.

수동 검증:

1. 일반 계정으로 `/admin/users` 접근 시 403/권한 차단이 되는지 확인합니다.
2. 관리자 계정으로 `/admin/users` 접근 시 목록을 확인합니다.
3. 사용자 목록 API의 JSON에 password/passwordHash/tokenVersion 같은 민감 정보가 없는지 확인합니다.
4. 탈퇴 계정이 `deletedAt` 값에 따라 탈퇴 상태로만 표시되는지 확인합니다.
