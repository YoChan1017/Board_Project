# Board Project ERD

```mermaid
erDiagram
    USERS ||--o{ POSTS : writes
    USERS ||--o{ COMMENTS : writes
    USERS ||--o{ POST_LIKES : likes

    BOARDS ||--o{ CATEGORIES : contains
    BOARDS ||--o{ POSTS : contains
    CATEGORIES ||--o{ POSTS : classifies

    POSTS ||--o{ COMMENTS : has
    POSTS ||--o{ POST_LIKES : receives
    POSTS ||--o{ ATTACHMENTS : has

    COMMENTS ||--o{ COMMENTS : replies_to

    USERS {
        BIGINT id PK
        VARCHAR username UK
        VARCHAR password
        VARCHAR nickname UK
        VARCHAR email UK
        VARCHAR role
        DATETIME created_at
        DATETIME updated_at
        DATETIME deleted_at
        INT token_version
    }

    BOARDS {
        BIGINT id PK
        VARCHAR name UK
        VARCHAR description
        DATETIME created_at
        DATETIME updated_at
    }

    CATEGORIES {
        BIGINT id PK
        BIGINT board_id FK
        VARCHAR name
        DATETIME created_at
        DATETIME updated_at
    }

    POSTS {
        BIGINT id PK
        BIGINT board_id FK
        BIGINT category_id FK
        BIGINT user_id FK
        VARCHAR title
        LONGTEXT content
        INT view_count
        INT like_count
        DATETIME created_at
        DATETIME updated_at
        DATETIME deleted_at
    }

    COMMENTS {
        BIGINT id PK
        BIGINT post_id FK
        BIGINT user_id FK
        BIGINT parent_id FK
        VARCHAR content
        DATETIME created_at
        DATETIME updated_at
        DATETIME deleted_at
    }

    POST_LIKES {
        BIGINT id PK
        BIGINT post_id FK
        BIGINT user_id FK
        DATETIME created_at
    }

    ATTACHMENTS {
        BIGINT id PK
        BIGINT post_id FK
        VARCHAR original_name
        VARCHAR stored_name
        VARCHAR file_path
        BIGINT file_size
        VARCHAR content_type
        DATETIME created_at
    }
```

## 관계 요약

- `users 1:N posts`
- `users 1:N comments`
- `users 1:N post_likes`
- `boards 1:N categories`
- `boards 1:N posts`
- `categories 1:N posts`
- `posts 1:N comments`
- `posts 1:N post_likes`
- `posts 1:N attachments`
- `comments 1:N comments` (`parent_id`로 대댓글 표현)

## 회원 토큰 버전

- `users.token_version`은 V8 마이그레이션에서 추가된다.
- 기본값은 `0`이며, JWT에 기록된 버전과 회원 레코드의 현재 버전을 비교해 이전 토큰을 거부하는 데 사용한다.
