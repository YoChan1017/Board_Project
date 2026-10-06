package com.example.board.dto.auth;

import com.example.board.enums.Role;

public class LoginResponse {

    private final Long userId;
    private final String username;
    private final String nickname;
    private final Role role;

    public LoginResponse(
            Long userId,
            String username,
            String nickname,
            Role role) {

        this.userId = userId;
        this.username = username;
        this.nickname = nickname;
        this.role = role;
    }

    public Long getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getNickname() {
        return nickname;
    }

    public Role getRole() {
        return role;
    }
}