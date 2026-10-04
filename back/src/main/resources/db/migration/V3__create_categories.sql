CREATE TABLE categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    board_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_categories PRIMARY KEY (id),
    CONSTRAINT uq_categories_board_name UNIQUE (board_id, name),
    CONSTRAINT fk_categories_board
        FOREIGN KEY (board_id) REFERENCES boards(id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_categories_board ON categories (board_id);