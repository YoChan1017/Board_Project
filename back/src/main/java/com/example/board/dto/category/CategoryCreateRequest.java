package com.example.board.dto.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CategoryCreateRequest {

    @NotBlank(message = "카테고리 이름은 필수입니다.")
    @Size(max = 100, message = "카테고리 이름은 100자 이하여야 합니다.")
    private String name;

    public CategoryCreateRequest() {
    }

    public String getName() {
        return name;
    }

    // Trim outer whitespace; internal spaces remain valid.
    public void setName(String name) {
        this.name = name == null ? null : name.trim();
    }
}
