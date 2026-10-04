# DB 설계 문서

`board-project`의 Spring Boot Backend를 개발하기 전에 MariaDB 데이터 모델을 설계하고 검토하기 위한 디렉터리이다.

> 이 디렉터리는 설계/문서화 목적이다. 실제 Spring Boot 실행 시 적용되는 Database Migration은 나중에 `back/src/main/resources/db/migration/`으로 옮겨 Flyway가 관리한다.

## 디렉터리

```text
db/
├── README.md
├── requirements.md
├── erd/
│   └── board-erd.md
├── schema/
│   ├── users.md
│   ├── boards.md
│   ├── categories.md
│   ├── posts.md
│   ├── comments.md
│   ├── post_likes.md
│   └── attachments.md
├── sql/
│   └── draft_schema.sql
└── seed/
    └── test_data.sql
```

## 설계 원칙

1. 회원, 게시판, 게시글, 댓글, 좋아요, 첨부파일을 별도 도메인으로 분리한다.
2. 주요 테이블은 `BIGINT` 기반 surrogate primary key를 사용한다.
3. 테이블 간 관계는 FK로 명시한다.
4. 삭제 이력 보존이 필요한 테이블은 `deleted_at` 기반 Soft Delete를 사용한다.
5. 비밀번호는 원문을 저장하지 않고 BCrypt 등의 해시 결과를 저장한다.
6. 게시글 목록 조회 패턴을 고려하여 인덱스를 설계한다.
7. 좋아요 중복은 `(post_id, user_id)` Unique Constraint로 방지한다.
8. 실제 파일 바이너리는 DB에 직접 저장하지 않고 파일 저장소/Object Storage를 사용하며 DB에는 메타데이터만 저장한다.
9. DB 구조 변경은 확정 후 Flyway Migration으로 버전 관리한다.
