CREATE TABLE post_likes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_post_likes PRIMARY KEY (id),
    CONSTRAINT uq_post_likes_post_user UNIQUE (post_id, user_id),
    CONSTRAINT fk_post_likes_post
        FOREIGN KEY (post_id) REFERENCES posts(id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_post_likes_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_post_likes_post ON post_likes (post_id);
CREATE INDEX idx_post_likes_user ON post_likes (user_id);