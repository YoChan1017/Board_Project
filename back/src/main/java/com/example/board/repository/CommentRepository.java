package com.example.board.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.board.entity.Comment;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 특정 게시글의 삭제되지 않은 댓글 목록
    List<Comment> findByPostIdAndDeletedAtIsNullOrderByCreatedAtAsc(Long postId);

    // 삭제되지 않은 댓글 상세 조회
    Optional<Comment> findByIdAndDeletedAtIsNull(Long commentId);

    // 특정 게시글에 댓글이 존재하는지 확인
    boolean existsByPostId(Long postId);

    /** Return comments by the authenticated user, excluding comments on deleted posts. */
    @Query(
        value = """
                SELECT c
                FROM Comment c
                WHERE c.user.username = :username
                  AND c.deletedAt IS NULL
                  AND c.post.deletedAt IS NULL
                  AND (
                    :keyword IS NULL OR :keyword = ''
                    OR LOWER(c.content) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(c.post.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
                """,
        countQuery = """
                SELECT COUNT(c)
                FROM Comment c
                WHERE c.user.username = :username
                  AND c.deletedAt IS NULL
                  AND c.post.deletedAt IS NULL
                  AND (
                    :keyword IS NULL OR :keyword = ''
                    OR LOWER(c.content) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(c.post.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
                """
    )
    @EntityGraph(attributePaths = {"post", "post.board", "post.category", "parent"})
    Page<Comment> findMyActiveCommentsByUsername(
            @Param("username") String username,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
