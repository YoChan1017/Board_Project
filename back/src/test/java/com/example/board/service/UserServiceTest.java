package com.example.board.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.example.board.dto.auth.LoginRequest;
import com.example.board.dto.auth.LoginResponse;
import com.example.board.dto.auth.ProfileResponse;
import com.example.board.dto.auth.ProfileUpdateRequest;
import com.example.board.dto.auth.SignupRequest;
import com.example.board.exception.InvalidCredentialsException;
import com.example.board.repository.UserRepository;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserServiceTest {

    @Autowired
    UserService userService;

    @Autowired
    UserRepository userRepository;

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
    }

    @Test
    void loginWrongPasswordTest() {
        LoginRequest request = new LoginRequest();
        request.setUsername("loginTest");
        request.setPassword("wrongPassword");

        InvalidCredentialsException exception = assertThrows(
                InvalidCredentialsException.class,
                () -> userService.login(request));

        assertEquals(
                "username 또는 password가 올바르지 않습니다.",
                exception.getMessage());
    }

    @Test
    void loginUserNotFoundTest() {
        LoginRequest request = new LoginRequest();
        request.setUsername("notExistUser");
        request.setPassword("password123");

        InvalidCredentialsException exception = assertThrows(
                InvalidCredentialsException.class,
                () -> userService.login(request));

        assertEquals(
                "username 또는 password가 올바르지 않습니다.",
                exception.getMessage());
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
        org.junit.jupiter.api.Assertions.assertNull(updated.getEmail());
    }
}
