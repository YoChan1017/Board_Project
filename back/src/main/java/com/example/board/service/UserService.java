package com.example.board.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.board.dto.auth.LoginRequest;
import com.example.board.dto.auth.LoginResponse;
import com.example.board.dto.auth.ProfileResponse;
import com.example.board.dto.auth.ProfileUpdateRequest;
import com.example.board.dto.auth.SignupRequest;
import com.example.board.entity.User;
import com.example.board.enums.Role;
import com.example.board.exception.BusinessException;
import com.example.board.exception.InvalidCredentialsException;
import com.example.board.exception.ResourceNotFoundException;
import com.example.board.repository.UserRepository;
import com.example.board.security.JwtTokenProvider;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public Long signup(SignupRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException(
                    "USERNAME_ALREADY_EXISTS",
                    "이미 사용 중인 username입니다.");
        }

        if (userRepository.existsByNickname(request.getNickname())) {
            throw new BusinessException(
                    "NICKNAME_ALREADY_EXISTS",
                    "이미 사용 중인 nickname입니다.");
        }

        String email = normalizeEmail(request.getEmail());
        if (email != null && userRepository.existsByEmail(email)) {
            throw new BusinessException(
                    "EMAIL_ALREADY_EXISTS",
                    "이미 사용 중인 email입니다.");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());
        user.setEmail(email);
        user.setRole(Role.USER);

        User savedUser = userRepository.save(user);
        return savedUser.getId();
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new InvalidCredentialsException(
                        "username 또는 password가 올바르지 않습니다."));

        if (user.getDeletedAt() != null) {
            throw new InvalidCredentialsException(
                    "username 또는 password가 올바르지 않습니다.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException(
                    "username 또는 password가 올바르지 않습니다.");
        }

        String accessToken = jwtTokenProvider.generateToken(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getRole().name());

        return new LoginResponse(
                accessToken,
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getRole());
    }

    public ProfileResponse getProfile(String username) {
        return new ProfileResponse(findActiveUser(username));
    }

    @Transactional
    public ProfileResponse updateProfile(
            String username,
            ProfileUpdateRequest request) {

        User user = findActiveUser(username);
        String nickname = request.getNickname();
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByNicknameAndIdNot(nickname, user.getId())) {
            throw new BusinessException(
                    "NICKNAME_ALREADY_EXISTS",
                    "이미 사용 중인 nickname입니다.");
        }

        if (email != null && userRepository.existsByEmailAndIdNot(email, user.getId())) {
            throw new BusinessException(
                    "EMAIL_ALREADY_EXISTS",
                    "이미 사용 중인 email입니다.");
        }

        user.setNickname(nickname);
        user.setEmail(email);
        // Flush so auditing updates updatedAt before the response snapshot is created.
        userRepository.flush();
        // Returning a DTO avoids exposing password hashes or mutable entity internals.
        return new ProfileResponse(user);
    }

    private User findActiveUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "사용자 정보를 찾을 수 없습니다."));

        if (user.getDeletedAt() != null) {
            throw new ResourceNotFoundException("사용자 정보를 찾을 수 없습니다.");
        }
        return user;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return null;
        }
        return email.trim();
    }
}
