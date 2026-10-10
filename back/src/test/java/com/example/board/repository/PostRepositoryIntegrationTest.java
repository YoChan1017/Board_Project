package com.example.board.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest(showSql = false)
@ActiveProfiles("test")
@AutoConfigureTestDatabase(
        replace = AutoConfigureTestDatabase.Replace.NONE
)
class PostRepositoryIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void 테스트_DB에_연결되고_Flyway_마이그레이션이_적용되어있다() {
        // 실제로 연결된 데이터베이스 확인
        String databaseName = jdbcTemplate.queryForObject(
                "SELECT DATABASE()",
                String.class
        );

        assertEquals("board_db_test", databaseName);

        // 성공적으로 적용된 Flyway 마이그레이션 개수 확인
        Integer migrationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history "
                + "WHERE success = TRUE",
                Integer.class
        );

        assertTrue(
                migrationCount != null && migrationCount >= 7,
                "Flyway 마이그레이션 V1~V7이 적용되어야 합니다."
        );
    }
}