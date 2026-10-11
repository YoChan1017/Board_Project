
package com.example.board.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private Long boardId;
    private String userToken;

    @BeforeEach
    void createTestUserAndBoard() {
        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "");

        String username = "security-user-" + suffix;
        String nickname = "sec-" + suffix;
        String boardName = "security-board-" + suffix;

        // 테스트용 일반 사용자 생성
        jdbcTemplate.update(
                "INSERT INTO users "
                + "(username, password, nickname, role) "
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
                "INSERT INTO boards (name, description) "
                + "VALUES (?, ?)",
                boardName,
                "Security integration test"
        );

        boardId = jdbcTemplate.queryForObject(
                "SELECT id FROM boards WHERE name = ?",
                Long.class,
                boardName
        );

        // DB의 일반 사용자 정보로 유효한 JWT 생성
        userToken = jwtTokenProvider.generateToken(
                userId,
                username,
                nickname,
                "USER"
        );
    }

    @Test
    void 토큰없이_보호된_API에_요청하면_401을_반환한다()
            throws Exception {

        mockMvc.perform(
                get("/api/boards/1/posts")
        )
                .andExpect(status().isUnauthorized())
                .andExpect(
                        content().contentTypeCompatibleWith(
                                MediaType.APPLICATION_JSON
                        )
                );
    }

    @Test
    void 잘못된_JWT로_요청하면_401을_반환한다()
            throws Exception {

        mockMvc.perform(
                get("/api/boards/1/posts")
                        .header(
                                HttpHeaders.AUTHORIZATION,
                                "Bearer invalid-token"
                        )
        )
                .andExpect(status().isUnauthorized())
                .andExpect(
                        content().contentTypeCompatibleWith(
                                MediaType.APPLICATION_JSON
                        )
                );
    }

    @Test
    void 유효한_JWT로_게시글_목록을_조회하면_200을_반환한다()
            throws Exception {

        mockMvc.perform(
                get("/api/boards/{boardId}/posts", boardId)
                        .header(
                                HttpHeaders.AUTHORIZATION,
                                "Bearer " + userToken
                        )
        )
                .andExpect(status().isOk())
                .andExpect(
                        content().contentTypeCompatibleWith(
                                MediaType.APPLICATION_JSON
                        )
                )
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.empty").value(true))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void 일반_사용자는_관리자_전용_게시판_생성_API에_접근할_수_없다()
            throws Exception {

        mockMvc.perform(
                post("/api/boards")
                        .header(
                                HttpHeaders.AUTHORIZATION,
                                "Bearer " + userToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
        )
                .andExpect(status().isForbidden())
                .andExpect(
                        content().contentTypeCompatibleWith(
                                MediaType.APPLICATION_JSON
                        )
                )
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
}
