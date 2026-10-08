package com.example.board.dto.comment;

import java.time.LocalDateTime;

import com.example.board.entity.Comment;

public class CommentResponse {

    private final Long id;
    private final Long postId;
    private final Long parentId;
    private final Long authorId;
    private final String authorNickname;
    private final String content;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public CommentResponse(
            Long id,
            Long postId,
            Long parentId,
            Long authorId,
            String authorNickname,
            String content,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        this.id = id;
        this.postId = postId;
        this.parentId = parentId;
        this.authorId = authorId;
        this.authorNickname = authorNickname;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static CommentResponse from(Comment comment) {

        Long parentId = null;

        if (comment.getParent() != null) {
            parentId = comment.getParent().getId();
        }

        return new CommentResponse(
                comment.getId(),
                comment.getPost().getId(),
                parentId,
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getContent(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public Long getPostId() {
        return postId;
    }

    public Long getParentId() {
        return parentId;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public String getAuthorNickname() {
        return authorNickname;
    }

    public String getContent() {
        return content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}