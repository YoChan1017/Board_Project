package com.example.board.dto.activity;

import java.time.LocalDateTime;

import com.example.board.entity.Post;

/** A lightweight view of an active post authored by the authenticated user. */
public class MyPostResponse {

    private final Long id;
    private final Long boardId;
    private final String boardName;
    private final String categoryName;
    private final String title;
    private final Integer viewCount;
    private final Integer likeCount;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public MyPostResponse(
            Long id,
            Long boardId,
            String boardName,
            String categoryName,
            String title,
            Integer viewCount,
            Integer likeCount,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.id = id;
        this.boardId = boardId;
        this.boardName = boardName;
        this.categoryName = categoryName;
        this.title = title;
        this.viewCount = viewCount;
        this.likeCount = likeCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static MyPostResponse from(Post post) {
        return new MyPostResponse(
                post.getId(),
                post.getBoard().getId(),
                post.getBoard().getName(),
                post.getCategory() == null ? null : post.getCategory().getName(),
                post.getTitle(),
                post.getViewCount(),
                post.getLikeCount(),
                post.getCreatedAt(),
                post.getUpdatedAt());
    }

    public Long getId() { return id; }
    public Long getBoardId() { return boardId; }
    public String getBoardName() { return boardName; }
    public String getCategoryName() { return categoryName; }
    public String getTitle() { return title; }
    public Integer getViewCount() { return viewCount; }
    public Integer getLikeCount() { return likeCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
