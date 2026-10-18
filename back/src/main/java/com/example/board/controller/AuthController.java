package com.example.board.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.example.board.dto.auth.LoginRequest;
import com.example.board.dto.auth.LoginResponse;
import com.example.board.dto.auth.ProfileResponse;
import com.example.board.dto.auth.ProfileUpdateRequest;
import com.example.board.dto.auth.SignupRequest;
import com.example.board.service.UserService;

import jakarta.validation.Valid;

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

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {

        LoginResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    /** Returns the authenticated user's safe profile, never a client-selected account. */
    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> me(Authentication authentication) {
        return ResponseEntity.ok(userService.getProfile(authentication.getName()));
    }

    /** Updates only the nickname and optional email of the authenticated user. */
    @PutMapping("/me")
    public ResponseEntity<ProfileResponse> updateMe(
            Authentication authentication,
            @Valid @RequestBody ProfileUpdateRequest request) {

        return ResponseEntity.ok(
                userService.updateProfile(authentication.getName(), request));
    }
}
