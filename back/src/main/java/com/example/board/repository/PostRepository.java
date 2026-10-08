package com.example.board.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.board.entity.Post;

public interface PostRepository extends JpaRepository<Post, Long> {

    // 특정 게시판에 게시글이 존재하는지 확인
    boolean existsByBoardId(Long boardId);

    // 특정 게시판의 삭제되지 않은 게시글 목록
    List<Post> findByBoardIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long boardId);

    // 삭제되지 않은 게시글 상세 조회
    Optional<Post> findByIdAndDeletedAtIsNull(Long postId);
}