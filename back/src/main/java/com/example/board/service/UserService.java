package com.example.board.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.board.dto.auth.AccountDeletionRequest;
import com.example.board.dto.auth.LoginRequest;
import com.example.board.dto.auth.LoginResponse;
import com.example.board.dto.auth.PasswordChangeRequest;
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

    private static final String WITHDRAWAL_CONFIRMATION = "탈퇴합니다";

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
            throw new BusinessException("USERNAME_ALREADY_EXISTS", "이미 사용 중인 username입니다.");
        }
        if (userRepository.existsByNickname(request.getNickname())) {
            throw new BusinessException("NICKNAME_ALREADY_EXISTS", "이미 사용 중인 nickname입니다.");
        }

        String email = normalizeEmail(request.getEmail());
        if (email != null && userRepository.existsByEmail(email)) {
            throw new BusinessException("EMAIL_ALREADY_EXISTS", "이미 사용 중인 email입니다.");
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

        if (user.getDeletedAt() != null
                || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException(
                    "username 또는 password가 올바르지 않습니다.");
        }

        String accessToken = jwtTokenProvider.generateToken(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getRole().name(),
                user.getTokenVersion());

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
            throw new BusinessException("NICKNAME_ALREADY_EXISTS", "이미 사용 중인 nickname입니다.");
        }
        if (email != null && userRepository.existsByEmailAndIdNot(email, user.getId())) {
            throw new BusinessException("EMAIL_ALREADY_EXISTS", "이미 사용 중인 email입니다.");
        }

        user.setNickname(nickname);
        user.setEmail(email);
        userRepository.flush();
        return new ProfileResponse(user);
    }

    /** Validates the current password, stores a new hash, and revokes all old JWTs. */
    @Transactional
    public void changePassword(String username, PasswordChangeRequest request) {
        User user = findActiveUser(username);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "현재 비밀번호가 올바르지 않습니다.");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "새 비밀번호는 현재 비밀번호와 달라야 합니다.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.flush();
    }

    /**
     * Soft-deletes an account while preserving foreign-key references from posts and comments.
     * PII is minimized, the username becomes reusable, and old JWTs remain bound to their
     * original user ID so they cannot authenticate as a later account with the same username.
     */
    @Transactional
    public void withdrawAccount(String username, AccountDeletionRequest request) {
        User user = findActiveUser(username);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "현재 비밀번호가 올바르지 않습니다.");
        }
        if (!WITHDRAWAL_CONFIRMATION.equals(request.getConfirmationText())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "탈퇴 확인란에 '탈퇴합니다'를 정확히 입력해 주세요.");
        }

        user.setDeletedAt(LocalDateTime.now());
        user.setUsername(createWithdrawnUsername(user));
        user.setNickname(createWithdrawnNickname(user));
        user.setEmail(null);
        // Replace the old credential hash; the raw random value is never returned or stored.
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.flush();
    }

    private String createWithdrawnUsername(User user) {
        String base = "withdrawn_" + user.getId();
        String candidate = base;
        int suffix = 1;
        while (candidate.equals(user.getUsername()) || userRepository.existsByUsername(candidate)) {
            candidate = base + "_" + suffix++;
        }
        return candidate;
    }

    private String createWithdrawnNickname(User user) {
        String base = "탈퇴회원_" + user.getId();
        String candidate = base;
        int suffix = 1;
        while (candidate.equals(user.getNickname())
                || userRepository.existsByNicknameAndIdNot(candidate, user.getId())) {
            candidate = base + "_" + suffix++;
        }
        return candidate;
    }

    private User findActiveUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("사용자 정보를 찾을 수 없습니다."));
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
