package com.example.board.dto.comment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CommentCreateRequest {

    @NotBlank(message = "댓글 내용은 필수입니다.")
    @Size(max = 1000, message = "댓글은 1000자 이하로 입력해주세요.")
    private String content;

    private Long parentId;

    public CommentCreateRequest() {
    }

    public String getContent() {
        return content;
    }

    // Normalize leading/trailing whitespace, then validate; spaces inside a comment remain valid.
    public void setContent(String content) {
        this.content = content == null ? null : content.trim();
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }
}
