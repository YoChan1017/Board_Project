package com.example.board.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.board.entity.Comment;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 특정 게시글의 삭제되지 않은 댓글 목록
    List<Comment> findByPostIdAndDeletedAtIsNullOrderByCreatedAtAsc(Long postId);

    // 삭제되지 않은 댓글 상세 조회
    Optional<Comment> findByIdAndDeletedAtIsNull(Long commentId);

    // 특정 게시글에 댓글이 존재하는지 확인
    boolean existsByPostId(Long postId);
}