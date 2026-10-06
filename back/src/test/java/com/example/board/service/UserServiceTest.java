package com.example.board.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.example.board.dto.auth.LoginRequest;
import com.example.board.dto.auth.LoginResponse;
import com.example.board.dto.auth.SignupRequest;
import com.example.board.entity.User;
import com.example.board.exception.InvalidCredentialsException;
import com.example.board.repository.UserRepository;

@SpringBootTest
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

        System.out.println("로그인 성공");
        System.out.println("userId: " + response.getUserId());
        System.out.println("username: " + response.getUsername());
        System.out.println("nickname: " + response.getNickname());
        System.out.println("role: " + response.getRole());

        assertEquals("loginTest", response.getUsername());
        assertEquals("로그인테스트", response.getNickname());
        assertNotNull(response.getAccessToken());
    }

    @Test
    void loginWrongPasswordTest() {

        LoginRequest request = new LoginRequest();

        request.setUsername("loginTest");
        request.setPassword("wrongPassword");

        InvalidCredentialsException exception =
                assertThrows(
                        InvalidCredentialsException.class,
                        () -> userService.login(request)
                );

        System.out.println("잘못된 비밀번호 테스트");
        System.out.println("message: " + exception.getMessage());

        assertEquals(
                "username 또는 password가 올바르지 않습니다.",
                exception.getMessage()
        );
    }

    @Test
    void loginUserNotFoundTest() {

        LoginRequest request = new LoginRequest();

        request.setUsername("notExistUser");
        request.setPassword("password123");

        InvalidCredentialsException exception =
                assertThrows(
                        InvalidCredentialsException.class,
                        () -> userService.login(request)
                );

        System.out.println("존재하지 않는 사용자 테스트");
        System.out.println("message: " + exception.getMessage());

        assertEquals(
                "username 또는 password가 올바르지 않습니다.",
                exception.getMessage()
        );
    }
}