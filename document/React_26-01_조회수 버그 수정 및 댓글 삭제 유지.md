# Board Project - 삭제 댓글 대댓글 유지 및 조회수 중복 증가 수정

## 변경 사항

### 1. 삭제된 댓글과 대댓글

- 댓글 목록 쿼리에서 `deleted_at IS NULL` 필터를 제거합니다. 소프트 삭제된 댓글 레코드도 목록에 포함해야 기존 대댓글의 `parentId` 관계가 유지됩니다.
- 응답 DTO에 `deleted` 상태를 추가합니다. 삭제된 댓글은 작성자·원문 내용 대신 `삭제된 댓글` / `삭제된 댓글입니다.`를 반환합니다.
- 프론트엔드에서 삭제된 댓글의 답글/수정/삭제 버튼을 숨기되, 그 아래에 이미 존재하는 대댓글은 기존 트리 렌더링으로 계속 표시합니다.
- DB 스키마 변경은 없습니다.

### 2. 조회수가 2씩 증가하는 현상

확인한 코드에서는 `front/src/main.jsx`가 `React.StrictMode`로 앱을 감싸고, `PostDetailPage`의 mount effect가 `boardApi.getPost(postId)`를 호출합니다. 개발 모드의 StrictMode는 effect setup/cleanup을 재실행할 수 있습니다. 그런데 백엔드 `GET /api/posts/{postId}`가 `PostService.findById()`에서 매번 조회수를 증가시키므로, 한 번의 화면 진입에 두 번의 GET이 나가면 조회수가 2 증가할 수 있습니다.

이를 두 군데에서 방어합니다.

- 프론트 `boardApi.getPost()`는 동일 게시글에 대해 완료 전인 상세 요청을 공유해 StrictMode의 동시 요청을 합칩니다.
- 백엔드 Repository는 `view_count = view_count + 1`을 DB에서 원자적으로 실행해 동시 조회의 lost-update 문제를 방지합니다. 이후 엔티티를 다시 읽어 증가한 값을 응답합니다.
- DB 스키마/마이그레이션 변경은 없습니다.

## 검증 시나리오

1. `back`에서 `mvn test` 실행. 특히 `PostServiceTest`와 기존 게시글 관련 테스트를 확인합니다.
2. `front`에서 `npm ci`, `npm run build`, `npm run lint` 실행.
3. 개발 모드에서 게시글 상세 페이지를 새로고침하고 Network 탭에서 `GET /api/posts/{postId}`가 동시에 두 번 전송되지 않는지 확인합니다. 조회수는 페이지를 새로고침할 때마다 정확히 1씩 증가해야 합니다.
4. 댓글이 있는 게시글에서 부모 댓글을 삭제합니다. 부모 댓글은 `삭제된 댓글`로 남고 `삭제된 댓글입니다.`가 표시되어야 하며, 그 아래 기존 대댓글은 그대로 보여야 합니다.
5. 삭제된 댓글에 답글/수정/삭제 버튼이 표시되지 않고, 일반 댓글의 기능은 정상인지 확인합니다.
