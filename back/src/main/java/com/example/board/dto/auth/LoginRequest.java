package com.example.board.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class LoginRequest {

    @NotBlank(message = "username은 필수입니다.")
    @Pattern(regexp = "^\\S+$", message = "username에는 공백 문자를 포함할 수 없습니다.")
    private String username;

    // Passwords may contain spaces; only empty or whitespace-only values are rejected.
    @NotBlank(message = "password는 필수입니다.")
    private String password;

    public LoginRequest() {
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
