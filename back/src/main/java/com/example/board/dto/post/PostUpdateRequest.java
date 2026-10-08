package com.example.board.dto.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PostUpdateRequest {

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 255, message = "제목은 200자 이하로 입력해주세요.")
    private String title;

    @NotBlank(message = "내용은 필수입니다.")
    private String content;

    private Long categoryId;

    public PostUpdateRequest() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }
}