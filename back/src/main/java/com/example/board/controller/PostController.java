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

import com.example.board.dto.post.PostCreateRequest;
import com.example.board.dto.post.PostListResponse;
import com.example.board.dto.post.PostResponse;
import com.example.board.dto.post.PostUpdateRequest;
import com.example.board.service.PostService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    /**
     * 특정 게시판의 게시글 목록 조회
     */
    @GetMapping("/boards/{boardId}/posts")
    public ResponseEntity<List<PostListResponse>> findByBoardId(
            @PathVariable Long boardId) {

        return ResponseEntity.ok(
                postService.findByBoardId(boardId)
        );
    }

    /**
     * 게시글 상세 조회
     */
    @GetMapping("/posts/{postId}")
    public ResponseEntity<PostResponse> findById(
            @PathVariable Long postId) {

        return ResponseEntity.ok(
                postService.findById(postId)
        );
    }

    /**
     * 게시글 작성
     */
    @PostMapping("/boards/{boardId}/posts")
    public ResponseEntity<PostResponse> create(
            @PathVariable Long boardId,
            @Valid @RequestBody PostCreateRequest request,
            Authentication authentication) {

        String username = authentication.getName();

        PostResponse response = postService.create(
                boardId,
                request,
                username
        );

        return ResponseEntity.status(201).body(response);
    }

    /**
     * 게시글 수정
     *
     * 작성자 본인 또는 ADMIN만 가능
     */
    @PutMapping("/posts/{postId}")
    public ResponseEntity<PostResponse> update(
            @PathVariable Long postId,
            @Valid @RequestBody PostUpdateRequest request,
            Authentication authentication) {

        String username = authentication.getName();
        boolean admin = isAdmin(authentication);

        return ResponseEntity.ok(
                postService.update(
                        postId,
                        request,
                        username,
                        admin
                )
        );
    }

    /**
     * 게시글 삭제
     *
     * 작성자 본인 또는 ADMIN만 가능
     */
    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long postId,
            Authentication authentication) {

        String username = authentication.getName();
        boolean admin = isAdmin(authentication);

        postService.delete(
                postId,
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