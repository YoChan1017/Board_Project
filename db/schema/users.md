# users

회원 계정, 권한, 탈퇴 상태 및 JWT 토큰 버전을 저장한다.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NO | PK | AUTO_INCREMENT | 회원 ID |
| username | VARCHAR(50) | NO | UK | - | 로그인 ID |
| password | VARCHAR(255) | NO | - | - | BCrypt 등의 해시 값 |
| nickname | VARCHAR(50) | NO | UK | - | 닉네임 |
| email | VARCHAR(100) | YES | UK | NULL | 이메일 |
| role | VARCHAR(20) | NO | - | USER | 권한 (`USER`, `ADMIN`) |
| created_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 생성 시간 |
| updated_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 수정 시간 |
| deleted_at | DATETIME(6) | YES | - | NULL | Soft Delete 시간 |
| token_version | INT | NO | - | 0 | 토큰 버전. 비밀번호 변경·계정 탈퇴 등에서 증가시켜 기존 JWT 무효화에 사용 |

## 제약조건

- `PRIMARY KEY (id)`
- `UNIQUE (username)`
- `UNIQUE (nickname)`
- `UNIQUE (email)`
- `token_version`은 `NOT NULL`, 기본값은 `0`이다.

## 마이그레이션

`token_version`은 처음 `users` 테이블을 생성하는 V1이 아니라 `back/src/main/resources/db/migration/V8__add_user_token_version.sql`에서 추가된다. 처음부터 DB를 만드는 경우 Flyway가 V1부터 V8까지 순서대로 적용한다. 이미 V1~V7이 적용된 DB는 백엔드 실행 시 Flyway가 V8을 적용한다.

## 주의

- 비밀번호 원문을 저장하지 않는다.
- 애플리케이션에서 `token_version`을 직접 임의 변경하지 않는다. 인증·계정 서비스의 토큰 무효화 흐름과 일관되게 관리한다.
- 운영 DB에 이미 적용된 마이그레이션 파일은 수정하지 않는다. 스키마 변경은 새 Flyway 버전 파일로 추가한다.
