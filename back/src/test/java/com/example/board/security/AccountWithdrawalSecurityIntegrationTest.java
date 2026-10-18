package com.example.board.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

import com.example.board.dto.auth.LoginRequest;
import com.example.board.dto.auth.LoginResponse;
import com.example.board.dto.auth.SignupRequest;
import com.example.board.service.UserService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AccountWithdrawalSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserService userService;

    private String username;
    private String nickname;
    private String oldToken;
    private Long originalUserId;

    @BeforeEach
    void createAccount() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        username = "withdrawal-" + suffix;
        nickname = "wd-" + suffix;

        SignupRequest signup = new SignupRequest();
        signup.setUsername(username);
        signup.setPassword("password123");
        signup.setNickname(nickname);
        signup.setEmail(null);
        originalUserId = userService.signup(signup);

        LoginRequest login = new LoginRequest();
        login.setUsername(username);
        login.setPassword("password123");
        LoginResponse response = userService.login(login);
        oldToken = response.getAccessToken();
    }

    @Test
    void withdrawalAnonymizesAccountAndOldTokenCannotAccessARecreatedUsername() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + oldToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(originalUserId));

        mockMvc.perform(delete("/api/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + oldToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"password123\",\"confirmationText\":\"탈퇴합니다\"}"))
                .andExpect(status().isNoContent());

        String anonymizedUsername = jdbcTemplate.queryForObject(
                "SELECT username FROM users WHERE id = ?", String.class, originalUserId);
        String anonymizedNickname = jdbcTemplate.queryForObject(
                "SELECT nickname FROM users WHERE id = ?", String.class, originalUserId);
        String storedEmail = jdbcTemplate.queryForObject(
                "SELECT email FROM users WHERE id = ?", String.class, originalUserId);
        java.sql.Timestamp deletedAt = jdbcTemplate.queryForObject(
                "SELECT deleted_at FROM users WHERE id = ?", java.sql.Timestamp.class, originalUserId);
        Integer tokenVersion = jdbcTemplate.queryForObject(
                "SELECT token_version FROM users WHERE id = ?", Integer.class, originalUserId);

        assertNotEquals(username, anonymizedUsername);
        assertTrue(anonymizedNickname.startsWith("탈퇴회원_"));
        assertNull(storedEmail);
        assertNotNull(deletedAt);
        assertEquals(1, tokenVersion);

        // The username can be registered again, but the old JWT is still bound to originalUserId.
        SignupRequest replacement = new SignupRequest();
        replacement.setUsername(username);
        replacement.setPassword("replacementPassword123");
        replacement.setNickname("replacement-" + UUID.randomUUID().toString().replace("-", ""));
        replacement.setEmail(null);
        Long replacementUserId = userService.signup(replacement);
        assertNotEquals(originalUserId, replacementUserId);

        mockMvc.perform(get("/api/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + oldToken))
                .andExpect(status().isUnauthorized());

        LoginRequest replacementLogin = new LoginRequest();
        replacementLogin.setUsername(username);
        replacementLogin.setPassword("replacementPassword123");
        String replacementToken = userService.login(replacementLogin).getAccessToken();

        mockMvc.perform(get("/api/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + replacementToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(replacementUserId));
    }

    @Test
    void incorrectPasswordDoesNotWithdrawAccount() throws Exception {
        mockMvc.perform(delete("/api/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + oldToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"wrong-password\",\"confirmationText\":\"탈퇴합니다\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + oldToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username));
    }

}
