CREATE TABLE posts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    board_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    content LONGTEXT NOT NULL,
    view_count INT UNSIGNED NOT NULL DEFAULT 0,
    like_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_at DATETIME(6) NULL,
    CONSTRAINT pk_posts PRIMARY KEY (id),
    CONSTRAINT fk_posts_board
        FOREIGN KEY (board_id) REFERENCES boards(id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_posts_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON UPDATE RESTRICT ON DELETE SET NULL,
    CONSTRAINT fk_posts_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_posts_board_created ON posts (board_id, created_at DESC, id DESC);
CREATE INDEX idx_posts_user ON posts (user_id);
CREATE INDEX idx_posts_category ON posts (category_id);