package com.example.board.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.board.entity.PostLike;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

}