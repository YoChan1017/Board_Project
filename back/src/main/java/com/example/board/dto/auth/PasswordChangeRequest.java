package com.example.board.dto.auth;

import com.example.board.validation.BcryptPasswordLength;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Password change request for the currently authenticated account. */
public class PasswordChangeRequest {

    @NotBlank(message = "currentPassword는 필수입니다.")
    @Size(max = 100, message = "currentPassword는 100자 이하여야 합니다.")
    private String currentPassword;

    @NotBlank(message = "newPassword는 필수입니다.")
    @Size(min = 8, max = 100, message = "newPassword는 8자 이상 100자 이하여야 합니다.")
    @BcryptPasswordLength
    private String newPassword;

    public PasswordChangeRequest() {
    }

    public String getCurrentPassword() { return currentPassword; }
    public String getNewPassword() { return newPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
