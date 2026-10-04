# post_likes

사용자별 게시글 좋아요 기록을 저장한다.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NO | PK | AUTO_INCREMENT | 좋아요 ID |
| post_id | BIGINT UNSIGNED | NO | FK | - | 게시글 ID |
| user_id | BIGINT UNSIGNED | NO | FK | - | 사용자 ID |
| created_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 좋아요 시간 |

## 핵심 제약조건

```sql
UNIQUE (post_id, user_id)
```

동일 사용자가 같은 게시글에 중복 좋아요를 저장하지 못하도록 한다.
