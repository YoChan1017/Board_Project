# categories

게시판 내부의 게시글 분류를 저장한다.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NO | PK | AUTO_INCREMENT | 카테고리 ID |
| board_id | BIGINT UNSIGNED | NO | FK | - | 게시판 ID |
| name | VARCHAR(100) | NO | - | - | 카테고리 이름 |
| created_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 생성 시간 |
| updated_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 수정 시간 |

`UNIQUE (board_id, name)`으로 같은 게시판에서 같은 카테고리를 중복 생성하지 않도록 한다.
