package com.example.board.dto.postlike;

public class PostLikeResponse {

    private Long postId;

    private Integer likeCount;

    private boolean likedByMe;

    public PostLikeResponse(
            Long postId,
            Integer likeCount,
            boolean likedByMe
    ) {
        this.postId = postId;
        this.likeCount = likeCount;
        this.likedByMe = likedByMe;
    }

    public Long getPostId() {
        return postId;
    }

    public Integer getLikeCount() {
        return likeCount;
    }

    public boolean isLikedByMe() {
        return likedByMe;
    }
}