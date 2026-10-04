CREATE TABLE comments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    parent_id BIGINT UNSIGNED NULL,
    content VARCHAR(1000) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_at DATETIME(6) NULL,
    CONSTRAINT pk_comments PRIMARY KEY (id),
    CONSTRAINT fk_comments_post
        FOREIGN KEY (post_id) REFERENCES posts(id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_id) REFERENCES comments(id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_comments_post_created ON comments (post_id, created_at ASC, id ASC);
CREATE INDEX idx_comments_parent ON comments (parent_id);
CREATE INDEX idx_comments_user ON comments (user_id);