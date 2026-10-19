package com.example.board.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

/** Checks UTF-8 byte length, rather than Java character count. */
public class BcryptPasswordLengthValidator
        implements ConstraintValidator<BcryptPasswordLength, String> {

    private static final int BCRYPT_MAX_PASSWORD_BYTES = 72;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // Let @NotBlank handle null and blank values.
        if (value == null) {
            return true;
        }
        return value.getBytes(StandardCharsets.UTF_8).length <= BCRYPT_MAX_PASSWORD_BYTES;
    }
}
