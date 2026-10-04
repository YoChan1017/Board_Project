# boards

서비스에서 제공하는 게시판 정보를 저장한다.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NO | PK | AUTO_INCREMENT | 게시판 ID |
| name | VARCHAR(100) | NO | UK | - | 게시판 이름 |
| description | VARCHAR(255) | YES | - | NULL | 설명 |
| created_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 생성 시간 |
| updated_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 수정 시간 |

`name`은 중복되지 않도록 `UNIQUE`를 사용한다.
