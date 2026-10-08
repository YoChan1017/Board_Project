package com.example.board.dto.post;

import java.time.LocalDateTime;

import com.example.board.entity.Post;

public class PostResponse {

    private final Long id;
    private final Long boardId;
    private final Long categoryId;
    private final String categoryName;
    private final Long authorId;
    private final String authorNickname;
    private final String title;
    private final String content;
    private final Integer viewCount;
    private final Integer likeCount;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public PostResponse(
            Long id,
            Long boardId,
            Long categoryId,
            String categoryName,
            Long authorId,
            String authorNickname,
            String title,
            String content,
            Integer viewCount,
            Integer likeCount,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        this.id = id;
        this.boardId = boardId;
        this.categoryId = categoryId;
        this.categoryName = categoryName;
        this.authorId = authorId;
        this.authorNickname = authorNickname;
        this.title = title;
        this.content = content;
        this.viewCount = viewCount;
        this.likeCount = likeCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static PostResponse from(Post post) {

        Long categoryId = null;
        String categoryName = null;

        if (post.getCategory() != null) {
            categoryId = post.getCategory().getId();
            categoryName = post.getCategory().getName();
        }

        return new PostResponse(
                post.getId(),
                post.getBoard().getId(),
                categoryId,
                categoryName,
                post.getUser().getId(),
                post.getUser().getNickname(),
                post.getTitle(),
                post.getContent(),
                post.getViewCount(),
                post.getLikeCount(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public Long getBoardId() {
        return boardId;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public String getAuthorNickname() {
        return authorNickname;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public Integer getViewCount() {
        return viewCount;
    }

    public Integer getLikeCount() {
        return likeCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}