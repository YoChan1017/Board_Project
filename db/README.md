# Database

Board Project의 MariaDB 데이터 설계와 SQL 참고 자료를 보관합니다.

## 구성

- `requirements.md`: 데이터 요구사항
- `erd/board-erd.md`: 테이블 관계도
- `schema/`: 테이블별 설계 문서
- `sql/draft_schema.sql`: 최신 스키마 모양을 반영한 설계용 SQL 초안
- `seed/test_data.sql`: 개발·테스트용 예시 데이터
- `FILE_MANIFEST.md`: 파일 목록

## 실제 스키마 관리

실제 애플리케이션 스키마는 `back/src/main/resources/db/migration/`의 Flyway 마이그레이션으로 관리합니다. 현재 마이그레이션은 V1~V8입니다.

| 버전 | 파일 | 변경 내용 |
|---|---|---|
| V1 | `V1__create_users.sql` | 회원 테이블 생성 |
| V2 | `V2__create_boards.sql` | 게시판 테이블 생성 |
| V3 | `V3__create_categories.sql` | 카테고리 테이블 생성 |
| V4 | `V4__create_posts.sql` | 게시글 테이블 생성 |
| V5 | `V5__create_comments.sql` | 댓글·대댓글 테이블 생성 |
| V6 | `V6__create_post_likes.sql` | 게시글 좋아요 테이블 생성 |
| V7 | `V7__create_attachments.sql` | 첨부파일 메타데이터 테이블 생성 |
| V8 | `V8__add_user_token_version.sql` | `users.token_version INT NOT NULL DEFAULT 0` 추가 |

### V8 적용 방식

- **새 데이터베이스:** 백엔드가 시작할 때 Flyway가 V1부터 V8까지 순서대로 적용합니다.
- **V1~V7이 적용된 기존 개발 데이터베이스:** 백엔드 시작 시 Flyway가 V8을 적용하고, 기존 회원의 `token_version` 값은 기본값 `0`으로 초기화됩니다.
- **주의:** `V8__add_user_token_version.sql`을 별도로 SQL 클라이언트에서 실행하지 마세요. Flyway가 적용하도록 둡니다. 이미 적용된 마이그레이션 파일을 수정하지 말고 이후 변경은 V9 이상의 새 파일로 추가합니다.

DB 기본 이름은 `board_db`입니다. MariaDB에 데이터베이스를 준비하고 백엔드의 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` 설정을 맞춰주세요.

개발 PC에서 MariaDB, STS(Spring Boot 백엔드), VS Code(React 프론트엔드)를 실행하는 순서와 환경변수 설정은 [로컬 개발환경 실행 가이드](../document/LOCAL_DEVELOPMENT_SETUP.md)를 참고하세요.

> `sql/draft_schema.sql`과 `seed/test_data.sql`은 참고 자료입니다. Flyway로 관리되는 환경에서 초안 스키마를 다시 실행하지 마세요. `draft_schema.sql`은 신규 설계 시점의 최종 스키마 모양을 보여주기 때문에 `token_version`을 포함하지만, 실제 마이그레이션에서는 V8에서 이 컬럼을 추가합니다. `seed/test_data.sql`은 개발·테스트용이며 운영 DB에서 실행하지 않습니다.
