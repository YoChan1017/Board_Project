package com.example.board.controller;

import com.example.board.dto.auth.SignupRequest;
import com.example.board.service.UserService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Long>> signup(
            @Valid @RequestBody SignupRequest request) {

        Long userId = userService.signup(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("userId", userId));
    }
}