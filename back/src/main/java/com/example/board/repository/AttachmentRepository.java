
package com.example.board.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.board.entity.Attachment;

public interface AttachmentRepository
        extends JpaRepository<Attachment, Long> {

    // 게시글별 첨부파일 목록 조회
    List<Attachment> findByPostIdOrderByCreatedAtAsc(Long postId);

    // 특정 게시글에 속한 첨부파일 조회
    Optional<Attachment> findByIdAndPostId(
            Long attachmentId,
            Long postId
    );

    // 게시글의 첨부파일 존재 여부 확인
    boolean existsByPostId(Long postId);
}