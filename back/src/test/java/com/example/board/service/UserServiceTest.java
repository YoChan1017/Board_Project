package com.example.board.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.board.dto.auth.LoginRequest;
import com.example.board.dto.auth.LoginResponse;
import com.example.board.dto.auth.PasswordChangeRequest;
import com.example.board.dto.auth.ProfileResponse;
import com.example.board.dto.auth.ProfileUpdateRequest;
import com.example.board.dto.auth.SignupRequest;
import com.example.board.entity.User;
import com.example.board.exception.InvalidCredentialsException;
import com.example.board.repository.UserRepository;
import com.example.board.security.JwtTokenProvider;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserServiceTest {

    @Autowired
    UserService userService;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        SignupRequest request = new SignupRequest();
        request.setUsername("loginTest");
        request.setPassword("password123");
        request.setNickname("로그인테스트");
        request.setEmail("login@test.com");
        userService.signup(request);
    }

    @Test
    void loginSuccessTest() {
        LoginRequest request = new LoginRequest();
        request.setUsername("loginTest");
        request.setPassword("password123");

        LoginResponse response = userService.login(request);
        assertEquals("loginTest", response.getUsername());
        assertEquals("로그인테스트", response.getNickname());
        assertNotNull(response.getAccessToken());
        assertEquals(0, jwtTokenProvider.validateToken(response.getAccessToken())
                .get("tokenVersion", Integer.class));
    }

    @Test
    void loginWrongPasswordTest() {
        LoginRequest request = new LoginRequest();
        request.setUsername("loginTest");
        request.setPassword("wrongPassword");

        InvalidCredentialsException exception = assertThrows(
                InvalidCredentialsException.class,
                () -> userService.login(request));
        assertEquals("username 또는 password가 올바르지 않습니다.", exception.getMessage());
    }

    @Test
    void loginUserNotFoundTest() {
        LoginRequest request = new LoginRequest();
        request.setUsername("notExistUser");
        request.setPassword("password123");

        InvalidCredentialsException exception = assertThrows(
                InvalidCredentialsException.class,
                () -> userService.login(request));
        assertEquals("username 또는 password가 올바르지 않습니다.", exception.getMessage());
    }

    @Test
    void profileCanBeReadAndUpdated() {
        ProfileResponse before = userService.getProfile("loginTest");
        assertEquals("로그인테스트", before.getNickname());
        assertEquals("login@test.com", before.getEmail());
        assertEquals("loginTest", before.getUsername());

        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setNickname("새 닉네임");
        request.setEmail(" new@example.com ");
        ProfileResponse updated = userService.updateProfile("loginTest", request);

        assertEquals("새 닉네임", updated.getNickname());
        assertEquals("new@example.com", updated.getEmail());
        assertEquals("loginTest", updated.getUsername());
        assertNotNull(updated.getRole());
        assertEquals("새 닉네임", userRepository.findByUsername("loginTest")
                .orElseThrow().getNickname());
    }

    @Test
    void blankEmailCanBeCleared() {
        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setNickname("로그인테스트");
        request.setEmail("   ");

        ProfileResponse updated = userService.updateProfile("loginTest", request);
        assertNull(updated.getEmail());
    }

    @Test
    void passwordChangeStoresHashAndIncrementsTokenVersion() {
        LoginRequest oldLogin = new LoginRequest();
        oldLogin.setUsername("loginTest");
        oldLogin.setPassword("password123");
        LoginResponse before = userService.login(oldLogin);
        assertEquals(0, jwtTokenProvider.validateToken(before.getAccessToken())
                .get("tokenVersion", Integer.class));

        PasswordChangeRequest change = new PasswordChangeRequest();
        change.setCurrentPassword("password123");
        change.setNewPassword("newPassword456");
        userService.changePassword("loginTest", change);

        User updatedUser = userRepository.findByUsername("loginTest").orElseThrow();
        assertNotEquals("newPassword456", updatedUser.getPassword());
        assertTrue(passwordEncoder.matches("newPassword456", updatedUser.getPassword()));
        assertEquals(1, updatedUser.getTokenVersion());

        assertThrows(InvalidCredentialsException.class, () -> userService.login(oldLogin));

        LoginRequest newLogin = new LoginRequest();
        newLogin.setUsername("loginTest");
        newLogin.setPassword("newPassword456");
        LoginResponse after = userService.login(newLogin);
        assertEquals(1, jwtTokenProvider.validateToken(after.getAccessToken())
                .get("tokenVersion", Integer.class));
        // The old JWT remains signed, but the filter rejects it because its version (0)
        // no longer matches the user's persisted version (1).
        assertEquals(0, jwtTokenProvider.validateToken(before.getAccessToken())
                .get("tokenVersion", Integer.class));
    }

    @Test
    void passwordChangeRejectsWrongCurrentPasswordWithoutChangingCredentials() {
        PasswordChangeRequest change = new PasswordChangeRequest();
        change.setCurrentPassword("incorrect-password");
        change.setNewPassword("newPassword456");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> userService.changePassword("loginTest", change));
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());

        User unchanged = userRepository.findByUsername("loginTest").orElseThrow();
        assertTrue(passwordEncoder.matches("password123", unchanged.getPassword()));
        assertEquals(0, unchanged.getTokenVersion());
    }

    @Test
    void passwordChangeRejectsReusingCurrentPassword() {
        PasswordChangeRequest change = new PasswordChangeRequest();
        change.setCurrentPassword("password123");
        change.setNewPassword("password123");

        assertThrows(ResponseStatusException.class,
                () -> userService.changePassword("loginTest", change));
        assertEquals(0, userRepository.findByUsername("loginTest")
                .orElseThrow().getTokenVersion());
    }
}
