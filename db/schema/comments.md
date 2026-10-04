# comments

게시글의 댓글과 대댓글을 저장한다.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NO | PK | AUTO_INCREMENT | 댓글 ID |
| post_id | BIGINT UNSIGNED | NO | FK | - | 게시글 ID |
| user_id | BIGINT UNSIGNED | NO | FK | - | 작성자 ID |
| parent_id | BIGINT UNSIGNED | YES | FK | NULL | 부모 댓글 ID |
| content | VARCHAR(1000) | NO | - | - | 댓글 내용 |
| created_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 생성 시간 |
| updated_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 수정 시간 |
| deleted_at | DATETIME(6) | YES | - | NULL | Soft Delete 시간 |

## 대댓글

```text
댓글 A: parent_id = NULL
 ├── 댓글 B: parent_id = A.id
 └── 댓글 C: parent_id = A.id
```

초기 구현에서는 대댓글을 1단계로 제한할 수 있다.
