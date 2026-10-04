# attachments

게시글 첨부파일의 메타데이터를 저장한다.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NO | PK | AUTO_INCREMENT | 파일 ID |
| post_id | BIGINT UNSIGNED | NO | FK | - | 게시글 ID |
| original_name | VARCHAR(255) | NO | - | - | 원본 파일명 |
| stored_name | VARCHAR(255) | NO | - | - | 실제 저장 파일명 |
| file_path | VARCHAR(500) | NO | - | - | 저장 경로 |
| file_size | BIGINT UNSIGNED | YES | - | NULL | 파일 크기(Byte) |
| content_type | VARCHAR(100) | YES | - | NULL | MIME Type |
| created_at | DATETIME(6) | NO | - | CURRENT_TIMESTAMP(6) | 업로드 시간 |

실제 파일 바이너리는 DB에 저장하지 않고 파일 시스템, NAS, S3 등의 저장소를 사용하며 DB에는 메타데이터만 저장한다.
