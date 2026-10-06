package com.example.board.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.example.board.dto.auth.SignupRequest;
import com.example.board.entity.User;
import com.example.board.repository.UserRepository;

@SpringBootTest
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void signupTest() {

        SignupRequest request = new SignupRequest();

        request.setUsername("service01");
        request.setPassword("password123");
        request.setNickname("서비스테스트");
        request.setEmail("service01@test.com");

        Long userId = userService.signup(request);

        User user = userRepository.findById(userId)
                .orElseThrow();

        System.out.println("생성된 회원 ID: " + user.getId());
        System.out.println("username: " + user.getUsername());
        System.out.println("nickname: " + user.getNickname());
        System.out.println("role: " + user.getRole());
        System.out.println("createdAt: " + user.getCreatedAt());

        assertEquals("service01", user.getUsername());
    }
}