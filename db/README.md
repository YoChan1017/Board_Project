# Database

Board Project의 MariaDB 데이터 설계와 SQL 참고 자료를 보관합니다.

## 구성

- `requirements.md`: 데이터 요구사항
- `erd/board-erd.md`: 테이블 관계도
- `schema/`: 테이블별 설계 문서
- `sql/draft_schema.sql`: 설계용 SQL 초안
- `seed/test_data.sql`: 개발·테스트용 예시 데이터
- `FILE_MANIFEST.md`: 파일 목록

## 적용 방식

실제 애플리케이션 스키마는 `back/src/main/resources/db/migration/`의 Flyway 마이그레이션으로 관리합니다. 현재 `V1`~`V8`이 있으며, 백엔드 실행 시 자동 적용됩니다.

DB 기본 이름은 `board_db`입니다. MariaDB에 데이터베이스를 준비하고 백엔드의 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` 설정을 맞춰주세요.

> `sql/draft_schema.sql`과 `seed/test_data.sql`은 참고 자료입니다. Flyway로 관리되는 환경에서 초안 스키마를 다시 실행하지 마세요. 이미 적용된 마이그레이션 파일은 수정하지 말고 변경 사항은 새 버전 파일(`V9__...sql` 등)로 추가합니다.
