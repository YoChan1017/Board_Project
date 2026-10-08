package com.example.board.dto.post;

import java.time.LocalDateTime;

import com.example.board.entity.Post;

public class PostListResponse {

    private final Long id;
    private final Long categoryId;
    private final String categoryName;
    private final String authorNickname;
    private final String title;
    private final Integer viewCount;
    private final Integer likeCount;
    private final LocalDateTime createdAt;

    public PostListResponse(
            Long id,
            Long categoryId,
            String categoryName,
            String authorNickname,
            String title,
            Integer viewCount,
            Integer likeCount,
            LocalDateTime createdAt) {

        this.id = id;
        this.categoryId = categoryId;
        this.categoryName = categoryName;
        this.authorNickname = authorNickname;
        this.title = title;
        this.viewCount = viewCount;
        this.likeCount = likeCount;
        this.createdAt = createdAt;
    }

    public static PostListResponse from(Post post) {

        Long categoryId = null;
        String categoryName = null;

        if (post.getCategory() != null) {
            categoryId = post.getCategory().getId();
            categoryName = post.getCategory().getName();
        }

        return new PostListResponse(
                post.getId(),
                categoryId,
                categoryName,
                post.getUser().getNickname(),
                post.getTitle(),
                post.getViewCount(),
                post.getLikeCount(),
                post.getCreatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public String getAuthorNickname() {
        return authorNickname;
    }

    public String getTitle() {
        return title;
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
}