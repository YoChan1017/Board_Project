# users

회원 계정과 권한을 저장한다.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NO | PK | AUTO_INCREMENT | 회원 ID |
| username | VARCHAR(50) | NO | UK | - | 로그인 ID |
| password | VARCHAR(255) | NO | - | - | BCrypt 등의 해시 값 |
| nickname | VARCHAR(50) | NO | UK | - | 닉네임 |
| email | VARCHAR(100) | YES | UK | NULL | 이메일 |
| role | VARCHAR(20) | NO | - | USER | 권한 |
| created_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 생성 시간 |
| updated_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 수정 시간 |
| deleted_at | DATETIME(6) | YES | - | NULL | Soft Delete 시간 |

## 제약조건

- `PRIMARY KEY (id)`
- `UNIQUE (username)`
- `UNIQUE (nickname)`
- `UNIQUE (email)`

## 주의

비밀번호 원문 저장 금지. `role`은 초기에는 `USER`, `ADMIN`만 사용한다.
