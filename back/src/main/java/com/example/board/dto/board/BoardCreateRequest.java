package com.example.board.dto.board;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class BoardCreateRequest {

    @NotBlank(message = "게시판 이름은 필수입니다.")
    @Size(max = 100, message = "게시판 이름은 100자 이하여야 합니다.")
    private String name;

    @Size(max = 255, message = "게시판 설명은 255자 이하여야 합니다.")
    private String description;

    public BoardCreateRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}