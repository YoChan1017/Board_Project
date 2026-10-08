package com.example.board.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.board.dto.comment.CommentCreateRequest;
import com.example.board.dto.comment.CommentListResponse;
import com.example.board.dto.comment.CommentResponse;
import com.example.board.dto.comment.CommentUpdateRequest;
import com.example.board.service.CommentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    /**
     * 특정 게시글의 댓글 목록 조회
     */
    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommentListResponse>> findByPostId(
            @PathVariable Long postId) {

        return ResponseEntity.ok(
                commentService.findByPostId(postId)
        );
    }

    /**
     * 댓글 상세 조회
     */
    @GetMapping("/comments/{commentId}")
    public ResponseEntity<CommentResponse> findById(
            @PathVariable Long commentId) {

        return ResponseEntity.ok(
                commentService.findById(commentId)
        );
    }

    /**
     * 댓글 / 대댓글 작성
     */
    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentResponse> create(
            @PathVariable Long postId,
            @Valid @RequestBody CommentCreateRequest request,
            Authentication authentication) {

        String username = authentication.getName();

        CommentResponse response = commentService.create(
                postId,
                request,
                username
        );

        return ResponseEntity.status(201).body(response);
    }

    /**
     * 댓글 수정
     *
     * 작성자 본인 또는 ADMIN만 수정 가능
     */
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<CommentResponse> update(
            @PathVariable Long commentId,
            @Valid @RequestBody CommentUpdateRequest request,
            Authentication authentication) {

        String username = authentication.getName();
        boolean admin = isAdmin(authentication);

        return ResponseEntity.ok(
                commentService.update(
                        commentId,
                        request,
                        username,
                        admin
                )
        );
    }

    /**
     * 댓글 삭제
     *
     * 작성자 본인 또는 ADMIN만 삭제 가능
     */
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long commentId,
            Authentication authentication) {

        String username = authentication.getName();
        boolean admin = isAdmin(authentication);

        commentService.delete(
                commentId,
                username,
                admin
        );

        return ResponseEntity.noContent().build();
    }

    /**
     * 현재 인증 사용자가 ADMIN인지 확인
     */
    private boolean isAdmin(Authentication authentication) {

        return authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        authority.getAuthority().equals("ROLE_ADMIN")
                );
    }
}