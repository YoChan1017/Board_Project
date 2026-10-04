# posts

게시글 핵심 데이터를 저장한다.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NO | PK | AUTO_INCREMENT | 게시글 ID |
| board_id | BIGINT UNSIGNED | NO | FK | - | 게시판 ID |
| category_id | BIGINT UNSIGNED | YES | FK | NULL | 카테고리 ID |
| user_id | BIGINT UNSIGNED | NO | FK | - | 작성자 ID |
| title | VARCHAR(200) | NO | - | - | 제목 |
| content | LONGTEXT | NO | - | - | 본문 |
| view_count | INT UNSIGNED | NO | - | 0 | 조회수 |
| like_count | INT UNSIGNED | NO | - | 0 | 좋아요 수 |
| created_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 생성 시간 |
| updated_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 수정 시간 |
| deleted_at | DATETIME(6) | YES | - | NULL | Soft Delete 시간 |

## Index

- `(board_id, created_at DESC, id DESC)`
- `(user_id)`
- `(category_id)`

게시글 목록에서 `board_id` 기준 최신순 조회를 빠르게 하기 위한 복합 인덱스를 우선 고려한다.
