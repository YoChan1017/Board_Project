package com.example.board.dto.comment;

import java.time.LocalDateTime;

import com.example.board.entity.Comment;

public class CommentListResponse {

    private final Long id;
    private final Long parentId;
    private final Long authorId;
    private final String authorNickname;
    private final String content;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final boolean deleted;

    public CommentListResponse(
            Long id,
            Long parentId,
            Long authorId,
            String authorNickname,
            String content,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            boolean deleted) {

        this.id = id;
        this.parentId = parentId;
        this.authorId = authorId;
        this.authorNickname = authorNickname;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.deleted = deleted;
    }

    public static CommentListResponse from(Comment comment) {

        Long parentId = null;

        if (comment.getParent() != null) {
            parentId = comment.getParent().getId();
        }

        boolean deleted = comment.getDeletedAt() != null;
        Long authorId = deleted ? null : comment.getUser().getId();
        String authorNickname = deleted
                ? "삭제된 댓글"
                : comment.getUser().getNickname();
        String content = deleted ? "삭제된 댓글입니다." : comment.getContent();

        return new CommentListResponse(
                comment.getId(),
                parentId,
                authorId,
                authorNickname,
                content,
                comment.getCreatedAt(),
                comment.getUpdatedAt(),
                deleted
        );
    }

    public Long getId() {
        return id;
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

    public boolean isDeleted() {
        return deleted;
    }
}
