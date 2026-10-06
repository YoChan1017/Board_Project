package com.example.board.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SignupRequest {

    @NotBlank(message = "username은 필수입니다.")
    @Size(min = 4, max = 50, message = "username은 4자 이상 50자 이하여야 합니다.")
    private String username;

    @NotBlank(message = "password는 필수입니다.")
    @Size(min = 8, max = 100, message = "password는 8자 이상 100자 이하여야 합니다.")
    private String password;

    @NotBlank(message = "nickname은 필수입니다.")
    @Size(min = 2, max = 50, message = "nickname은 2자 이상 50자 이하여야 합니다.")
    private String nickname;

    @Email(message = "올바른 email 형식이 아닙니다.")
    @Size(max = 100, message = "email은 100자 이하여야 합니다.")
    private String email;

    public SignupRequest() {
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

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}