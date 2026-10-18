package com.example.board.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Only editable profile fields are accepted. Identity and role are server-controlled. */
public class ProfileUpdateRequest {

    @NotBlank(message = "nickname은 필수입니다.")
    @Size(min = 2, max = 50, message = "nickname은 2자 이상 50자 이하여야 합니다.")
    private String nickname;

    @Email(message = "올바른 email 형식이 아닙니다.")
    @Size(max = 100, message = "email은 100자 이하여야 합니다.")
    private String email;

    public ProfileUpdateRequest() {
    }

    public String getNickname() { return nickname; }
    public String getEmail() { return email; }

    public void setNickname(String nickname) {
        this.nickname = nickname == null ? null : nickname.trim();
    }

    public void setEmail(String email) {
        this.email = email == null ? null : email.trim();
    }
}
