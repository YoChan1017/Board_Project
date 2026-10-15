# React 09 — 공통 상태 UI 컴포넌트 정리

## 목표

여러 화면에서 따로 구현하던 로딩, 오류, 성공, 빈 목록 상태를 재사용 가능한 컴포넌트로 통일합니다. API 엔드포인트, 요청 파라미터, 권한 검사, 게시글/댓글/첨부파일 처리 방식은 변경하지 않습니다.

## 작업 내용

- `front/src/components/FeedbackState.jsx` — 공통 `LoadingState`, `ErrorMessage`, `SuccessMessage`, `EmptyState` 제공
- `front/src/pages/BoardsPage.jsx` — 게시판/게시글 로딩 표시와 게시판 오류 표시를 공통 컴포넌트로 전환
- `front/src/pages/AdminPostManagementPage.jsx` — 관리자 게시글 목록의 로딩·오류·성공·빈 상태 통일
- `front/src/components/CommentsSection.jsx` — 댓글 목록 로딩·오류·빈 상태 통일
- `front/src/components/AttachmentsSection.jsx` — 첨부파일 로딩·오류·성공·빈 상태 통일
- `front/ui-feedback-components.css.txt` — 공통 컴포넌트 스타일. 기존 `App.css`를 덮어쓰지 않고 아래 안내대로 추가

## 공통 컴포넌트 사용법

```jsx
import { EmptyState, ErrorMessage, LoadingState, SuccessMessage } from '../components/FeedbackState'

{isLoading && <LoadingState>목록을 불러오는 중입니다...</LoadingState>}
{error && <ErrorMessage>{error}</ErrorMessage>}
{notice && <SuccessMessage>{notice}</SuccessMessage>}
{items.length === 0 && <EmptyState title="등록된 항목이 없습니다." />}
```

- `LoadingState`: `role="status"`와 장식용 스피너를 포함합니다.
- `ErrorMessage`: `role="alert"`를 포함하며, 필요하면 `actionLabel`과 `onAction`으로 다시 시도 버튼을 붙일 수 있습니다.
- `SuccessMessage`: `role="status"`로 완료 알림을 전달합니다. `as="p"`로 태그 종류를 선택할 수 있습니다.
- `EmptyState`: `title`, `description`, `icon`, `className`을 상황에 맞게 전달합니다.

## 확인 항목

- JSX/JS 문법 파싱과 CSS 중괄호 균형을 점검합니다.
- ZIP 무결성을 확인합니다.
- 이 패치에서는 실제 백엔드와 연결한 브라우저 E2E 테스트를 수행했다고 주장하지 않습니다.
