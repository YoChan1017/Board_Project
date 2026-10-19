-- Board Project - Local Test Seed
-- 개발/설계 검증용이다. 운영 DB에서 실행하지 않는다.
-- token_version은 V8에서 DEFAULT 0으로 추가되므로 INSERT에서 생략한다.

USE board_db;

INSERT INTO users (username, password, nickname, email, role)
VALUES
    ('admin01', 'REPLACE_WITH_BCRYPT_HASH', '관리자', 'admin@example.com', 'ADMIN'),
    ('user01', 'REPLACE_WITH_BCRYPT_HASH', '사용자1', 'user01@example.com', 'USER'),
    ('user02', 'REPLACE_WITH_BCRYPT_HASH', '사용자2', 'user02@example.com', 'USER');

INSERT INTO boards (name, description)
VALUES
    ('자유게시판', '자유롭게 이야기를 나누는 게시판'),
    ('질문게시판', '개발 및 서비스 관련 질문 게시판'),
    ('공지사항', '서비스 공지사항 게시판');

INSERT INTO categories (board_id, name)
VALUES
    (1, '일상'),
    (1, '게임'),
    (1, '기타'),
    (2, 'Spring'),
    (2, 'React');

INSERT INTO posts (board_id, category_id, user_id, title, content)
VALUES
    (1, 1, 2, '첫 번째 게시글', '게시판 프로젝트 테스트용 게시글입니다.'),
    (1, 2, 3, '게임 이야기', '게시판 기능을 테스트하고 있습니다.'),
    (2, 4, 2, 'Spring Boot 질문', 'Spring Boot 관련 질문입니다.');

INSERT INTO comments (post_id, user_id, parent_id, content)
VALUES
    (1, 3, NULL, '첫 번째 댓글입니다.'),
    (1, 2, 1, '대댓글 테스트입니다.'),
    (2, 2, NULL, '두 번째 게시글의 댓글입니다.');

INSERT INTO post_likes (post_id, user_id)
VALUES
    (1, 2),
    (1, 3),
    (2, 2);

INSERT INTO attachments
    (post_id, original_name, stored_name, file_path, file_size, content_type)
VALUES
    (1, 'example.txt', '20261004_000001_example.txt',
     '/uploads/2026/10/04/20261004_000001_example.txt',
     1024, 'text/plain');
