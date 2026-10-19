# Database Requirements

## 1. 목적

게시판 서비스에서 사용하는 회원, 게시판, 게시글 및 부가 기능을 MariaDB에서 관계형 데이터로 관리한다.

## 2. 기능별 데이터 요구사항

### 회원
- 회원가입
- 로그인/로그아웃
- 내 정보 조회
- 회원 정보 수정
- `USER` / `ADMIN` 권한 구분
- Soft Delete
- `token_version`으로 비밀번호 변경·계정 탈퇴 이후 기존 JWT 무효화 지원

### 게시판
- 게시판 생성/조회/수정/삭제
- 게시판별 게시글 관리

### 카테고리
- 게시판별 카테고리
- 게시글 카테고리 지정

### 게시글
- 작성자/게시판 연결
- 제목/본문
- 조회수
- 좋아요 수
- 생성/수정 시간
- Soft Delete

### 댓글
- 게시글별 댓글
- 작성자 연결
- 대댓글
- 수정/삭제

### 좋아요
- 사용자별 게시글 좋아요
- 동일 게시글 중복 좋아요 방지

### 첨부파일
- 게시글별 파일
- 원본명/저장명/경로
- 파일 크기
- MIME Type

## 3. 조회 요구사항

게시글 목록은 다음 조건을 지원한다.

```text
board_id
category_id
keyword
created_at DESC
page
size
```

댓글은 다음 기준을 사용한다.

```text
post_id
parent_id
created_at ASC
```

## 4. 검색

초기 버전은 제목/본문 검색을 구현한다.

데이터 규모가 커지면 MariaDB Full-Text Search 또는 별도 검색 엔진 도입을 검토한다.

## 5. 무결성

- PK는 모든 주요 테이블에 존재한다.
- FK로 참조 관계를 명확하게 한다.
- 필수 컬럼은 `NOT NULL`로 정의한다.
- 중복되면 안 되는 값은 `UNIQUE`를 사용한다.
- 좋아요는 `(post_id, user_id)`를 UNIQUE로 설정한다.
- `users.token_version`은 `NOT NULL DEFAULT 0`으로 정의한다.
- 이미 배포된 DB 스키마 변경은 Flyway 새 버전 마이그레이션으로 관리한다.
