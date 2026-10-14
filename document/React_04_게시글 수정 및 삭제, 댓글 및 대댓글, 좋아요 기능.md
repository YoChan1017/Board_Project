# Board_Project 프론트엔드 4차 작업 정리

## 목표
3차 작업의 게시글 상세 페이지를 확장해 게시글 수정·삭제, 댓글/대댓글, 좋아요 기능을 연결합니다. 백엔드 컨트롤러나 DTO는 변경하지 않습니다.

## 수정 전 조건
- 1차 인증 화면, 2차 게시판 목록, 3차 게시글 상세 및 작성 화면을 프로젝트에 적용한 상태여야 합니다.
- 인증 성공 시 `AuthContext`의 사용자 객체에 `userId`, `role` 값이 있어야 합니다. 현재 저장소의 로그인 응답에 해당 값이 포함됩니다.

## 파일 배치
| ZIP 경로 | 수행 내용 |
|---|---|
| `front/src/api/boardApi.js` | 게시글 수정·삭제, 댓글 CRUD, 좋아요 API 메서드 추가 |
| `front/src/pages/PostDetailPage.jsx` | 수정/삭제 버튼, 좋아요 토글, 댓글 컴포넌트 표시 |
| `front/src/pages/PostEditPage.jsx` | 게시글 수정 화면 신규 추가 |
| `front/src/components/CommentsSection.jsx` | 댓글/대댓글 조회·작성·수정·삭제 화면 신규 추가 |
| `front/src/App.jsx` | `/posts/:postId/edit` 라우트 추가 |
| `front/comments-post-actions.css.txt` | 4차 UI 스타일. 기존 `App.css` 끝에 추가 |

## API 매핑
- `PUT /api/posts/{postId}` — 게시글 수정
- `DELETE /api/posts/{postId}` — 게시글 삭제
- `GET /api/posts/{postId}/comments` — 댓글 목록
- `POST /api/posts/{postId}/comments` — 댓글/대댓글 작성 (`content`, `parentId`)
- `PUT /api/comments/{commentId}` — 댓글 수정 (`content`)
- `DELETE /api/comments/{commentId}` — 댓글 삭제
- `GET /api/posts/{postId}/likes` — 좋아요 상태 및 개수
- `POST /api/posts/{postId}/likes` — 좋아요 등록
- `DELETE /api/posts/{postId}/likes` — 좋아요 취소

## 권한 처리
프론트엔드는 `authorId`와 로그인한 `userId`를 비교하고, `role`이 `ADMIN`/`ROLE_ADMIN`이면 관리자 작업 버튼을 표시합니다. 이것은 UI를 위한 표시 조건입니다. 실제 접근 권한은 백엔드 검사가 최종적으로 결정합니다.

댓글/게시글 삭제 전에는 브라우저 확인 창을 표시합니다. 백엔드는 삭제 API에서 소프트 삭제를 처리하므로 삭제 성공 후 목록을 새로 불러옵니다.

## 테스트 체크리스트
- [ ] 내 게시글 상세 화면에 수정/삭제 버튼이 나타난다.
- [ ] 다른 사용자의 글에는 수정/삭제 버튼이 표시되지 않는다. (관리자는 표시 가능)
- [ ] 내 게시글을 수정하면 변경 내용이 상세 화면에 반영된다.
- [ ] 내 게시글을 삭제하면 게시판 목록으로 이동한다.
- [ ] 댓글을 등록하고 새로고침해도 계속 표시된다.
- [ ] 댓글 작성자가 댓글을 수정/삭제할 수 있다.
- [ ] 댓글에 답글을 달 수 있고 들여쓰기되어 표시된다.
- [ ] 좋아요를 누르면 개수가 변하고, 다시 누르면 취소된다.
- [ ] 비작성자의 수정/삭제 API 요청은 백엔드에서 거부된다.

## 실행
프로젝트의 기존 방식대로 백엔드와 MariaDB를 실행한 뒤, `front` 디렉터리에서 `npm run dev`를 실행합니다. 이 환경에서는 사용자의 로컬 백엔드와 브라우저를 직접 실행할 수 없으므로 통합 테스트 완료를 주장하지 않습니다.
