
package com.example.board.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.example.board.entity.Post;

@DataJpaTest(showSql = false)
@ActiveProfiles("test")
@AutoConfigureTestDatabase(
        replace = AutoConfigureTestDatabase.Replace.NONE
)
class PostRepositoryIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PostRepository postRepository;

    private Long boardId;

    @BeforeEach
    void prepareTestData() {
        // 테스트마다 고유한 사용자명과 게시판 이름 생성
        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "");

        String username = "repo-user-" + suffix;
        String nickname = "repo-" + suffix;
        String boardName = "repo-board-" + suffix;

        // 테스트용 사용자 생성
        jdbcTemplate.update(
                "INSERT INTO users (username, password, nickname, role) "
                + "VALUES (?, ?, ?, ?)",
                username,
                "test-password",
                nickname,
                "USER"
        );

        Long userId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE username = ?",
                Long.class,
                username
        );

        // 테스트용 게시판 생성
        jdbcTemplate.update(
                "INSERT INTO boards (name, description) VALUES (?, ?)",
                boardName,
                "Repository integration test"
        );

        boardId = jdbcTemplate.queryForObject(
                "SELECT id FROM boards WHERE name = ?",
                Long.class,
                boardName
        );

        // 게시글 생성 시각을 다르게 설정하여 정렬 결과를 검증
        LocalDateTime baseTime =
                LocalDateTime.of(2026, 10, 1, 10, 0);

        // 1. 제목에 검색어 포함
        insertPost(
                userId,
                "스프링 제목 검색",
                "일반적인 본문",
                baseTime,
                null
        );

        // 2. 본문에 검색어 포함
        insertPost(
                userId,
                "일반 제목",
                "본문에 스프링 포함",
                baseTime.minusHours(1),
                null
        );

        // 3. 검색어는 포함하지만 삭제된 게시글
        insertPost(
                userId,
                "삭제된 스프링 글",
                "삭제된 글의 본문",
                baseTime.plusHours(1),
                baseTime.plusHours(2)
        );

        // 4. 검색어가 포함되지 않은 게시글
        insertPost(
                userId,
                "다른 제목",
                "검색어 없는 본문",
                baseTime.minusHours(2),
                null
        );
    }

    private void insertPost(
            Long userId,
            String title,
            String content,
            LocalDateTime createdAt,
            LocalDateTime deletedAt) {

        Timestamp createdTimestamp =
                Timestamp.valueOf(createdAt);

        Timestamp deletedTimestamp =
                deletedAt == null
                        ? null
                        : Timestamp.valueOf(deletedAt);

        jdbcTemplate.update(
                "INSERT INTO posts "
                + "(board_id, category_id, user_id, title, content, "
                + "created_at, updated_at, deleted_at) "
                + "VALUES (?, NULL, ?, ?, ?, ?, ?, ?)",
                boardId,
                userId,
                title,
                content,
                createdTimestamp,
                createdTimestamp,
                deletedTimestamp
        );
    }

    private Sort postSort() {
        return Sort.by(Sort.Direction.DESC, "createdAt")
                .and(Sort.by(Sort.Direction.DESC, "id"));
    }

    @Test
    void 테스트_DB에_연결되고_Flyway_마이그레이션이_적용되어있다() {
        String databaseName = jdbcTemplate.queryForObject(
                "SELECT DATABASE()",
                String.class
        );

        assertEquals("board_db_test", databaseName);

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

    @Test
    void 검색어가_제목이나_본문에_포함된_게시글만_조회한다() {
        Page<Post> result =
                postRepository.searchActivePostsByBoardIdAndKeyword(
                        boardId,
                        "스프링",
                        PageRequest.of(0, 10, postSort())
                );

        List<String> titles = result.getContent()
                .stream()
                .map(Post::getTitle)
                .toList();

        assertEquals(2, result.getTotalElements());
        assertEquals(
                List.of("스프링 제목 검색", "일반 제목"),
                titles
        );

        assertFalse(titles.contains("삭제된 스프링 글"));
        assertFalse(titles.contains("다른 제목"));
    }

    @Test
    void 검색결과가_페이지별로_나뉜다() {
        Page<Post> firstPage =
                postRepository.searchActivePostsByBoardIdAndKeyword(
                        boardId,
                        "스프링",
                        PageRequest.of(0, 1, postSort())
                );

        Page<Post> secondPage =
                postRepository.searchActivePostsByBoardIdAndKeyword(
                        boardId,
                        "스프링",
                        PageRequest.of(1, 1, postSort())
                );

        assertEquals(2, firstPage.getTotalElements());
        assertEquals(2, firstPage.getTotalPages());
        assertEquals(1, firstPage.getNumberOfElements());

        assertEquals(
                "스프링 제목 검색",
                firstPage.getContent().get(0).getTitle()
        );

        assertEquals(1, secondPage.getNumber());
        assertEquals(1, secondPage.getNumberOfElements());

        assertEquals(
                "일반 제목",
                secondPage.getContent().get(0).getTitle()
        );

        assertTrue(secondPage.isLast());
    }

    @Test
    void 일반_게시글_목록에서도_삭제된_게시글을_제외한다() {
        Page<Post> result =
                postRepository.findByBoardIdAndDeletedAtIsNull(
                        boardId,
                        PageRequest.of(0, 10, postSort())
                );

        List<String> titles = result.getContent()
                .stream()
                .map(Post::getTitle)
                .toList();

        assertEquals(3, result.getTotalElements());
        assertFalse(titles.contains("삭제된 스프링 글"));
        assertTrue(titles.contains("스프링 제목 검색"));
        assertTrue(titles.contains("일반 제목"));
        assertTrue(titles.contains("다른 제목"));
    }
}
