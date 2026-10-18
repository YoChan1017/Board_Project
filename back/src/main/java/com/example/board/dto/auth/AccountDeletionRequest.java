package com.example.board.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request to withdraw the currently authenticated account after re-authentication. */
public class AccountDeletionRequest {

    @NotBlank(message = "password는 필수입니다.")
    @Size(max = 100, message = "password는 100자 이하여야 합니다.")
    private String password;

    @NotBlank(message = "confirmationText는 필수입니다.")
    @Size(max = 20, message = "confirmationText는 20자 이하여야 합니다.")
    private String confirmationText;

    public AccountDeletionRequest() {
    }

    public String getPassword() {
        return password;
    }

    public String getConfirmationText() {
        return confirmationText;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setConfirmationText(String confirmationText) {
        this.confirmationText = confirmationText == null
                ? null
                : confirmationText.trim();
    }
}
