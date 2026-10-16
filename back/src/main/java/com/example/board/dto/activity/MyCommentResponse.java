package com.example.board.dto.activity;

import java.time.LocalDateTime;

import com.example.board.entity.Comment;

/** A lightweight view of an active comment written on an active post. */
public class MyCommentResponse {

    private final Long id;
    private final Long postId;
    private final Long parentId;
    private final String postTitle;
    private final Long boardId;
    private final String boardName;
    private final String categoryName;
    private final String content;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public MyCommentResponse(
            Long id,
            Long postId,
            Long parentId,
            String postTitle,
            Long boardId,
            String boardName,
            String categoryName,
            String content,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.id = id;
        this.postId = postId;
        this.parentId = parentId;
        this.postTitle = postTitle;
        this.boardId = boardId;
        this.boardName = boardName;
        this.categoryName = categoryName;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static MyCommentResponse from(Comment comment) {
        Long parentId = comment.getParent() == null ? null : comment.getParent().getId();
        var post = comment.getPost();
        var board = post.getBoard();
        return new MyCommentResponse(
                comment.getId(),
                post.getId(),
                parentId,
                post.getTitle(),
                board.getId(),
                board.getName(),
                post.getCategory() == null ? null : post.getCategory().getName(),
                comment.getContent(),
                comment.getCreatedAt(),
                comment.getUpdatedAt());
    }

    public Long getId() { return id; }
    public Long getPostId() { return postId; }
    public Long getParentId() { return parentId; }
    public String getPostTitle() { return postTitle; }
    public Long getBoardId() { return boardId; }
    public String getBoardName() { return boardName; }
    public String getCategoryName() { return categoryName; }
    public String getContent() { return content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
