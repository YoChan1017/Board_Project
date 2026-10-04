CREATE TABLE attachments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id BIGINT UNSIGNED NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT UNSIGNED NULL,
    content_type VARCHAR(100) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_attachments PRIMARY KEY (id),
    CONSTRAINT fk_attachments_post
        FOREIGN KEY (post_id) REFERENCES posts(id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_attachments_post ON attachments (post_id);