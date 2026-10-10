
package com.example.board.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.board.entity.Post;

public interface PostRepository extends JpaRepository<Post, Long> {

    // Check whether a post exists in a board
    boolean existsByBoardId(Long boardId);

    // Find active posts with pagination
    Page<Post> findByBoardIdAndDeletedAtIsNull(
            Long boardId,
            Pageable pageable
    );

    // Search active posts by title or content
    @Query("""
            SELECT p
            FROM Post p
            WHERE p.board.id = :boardId
              AND p.deletedAt IS NULL
              AND (
                  LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  OR LOWER(p.content) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    Page<Post> searchActivePostsByBoardIdAndKeyword(
            @Param("boardId") Long boardId,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    // Find an active post by ID
    Optional<Post> findByIdAndDeletedAtIsNull(Long postId);
}
