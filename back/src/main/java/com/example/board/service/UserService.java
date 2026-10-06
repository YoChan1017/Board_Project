package com.example.board.service;

import com.example.board.exception.BusinessException;
import com.example.board.dto.auth.LoginRequest;
import com.example.board.dto.auth.LoginResponse;
import com.example.board.enums.Role;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.board.dto.auth.SignupRequest;
import com.example.board.entity.User;
import com.example.board.enums.Role;
import com.example.board.repository.UserRepository;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Long signup(SignupRequest request) {

        if (userRepository.existsByUsername(request.getUsername())) {
        	throw new BusinessException(
                    "USERNAME_ALREADY_EXISTS",
                    "이미 사용 중인 username입니다."
            );
        }

        if (userRepository.existsByNickname(request.getNickname())) {
        	throw new BusinessException(
                    "NICKNAME_ALREADY_EXISTS",
                    "이미 사용 중인 nickname입니다."
            );
        }

        if (request.getEmail() != null
                && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {

        	throw new BusinessException(
                    "EMAIL_ALREADY_EXISTS",
                    "이미 사용 중인 email입니다."
            );
        }

        User user = new User();

        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());
        user.setEmail(request.getEmail());
        user.setRole(Role.USER);

        User savedUser = userRepository.save(user);

        return savedUser.getId();
    }
    
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BusinessException(
                        "INVALID_CREDENTIALS",
                        "username 또는 password가 올바르지 않습니다."
                ));

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {

            throw new BusinessException(
                    "INVALID_CREDENTIALS",
                    "username 또는 password가 올바르지 않습니다."
            );
        }

        if (user.getDeletedAt() != null) {
            throw new BusinessException(
                    "INVALID_CREDENTIALS",
                    "username 또는 password가 올바르지 않습니다."
            );
        }

        return new LoginResponse(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getRole()
        );
    }
}