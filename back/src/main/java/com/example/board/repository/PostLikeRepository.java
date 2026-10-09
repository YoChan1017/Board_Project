package com.example.board.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.board.entity.PostLike;

public interface PostLikeRepository
        extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByPostIdAndUserId(
            Long postId,
            Long userId
    );

    boolean existsByPostIdAndUserId(
            Long postId,
            Long userId
    );

    long countByPostId(Long postId);
}