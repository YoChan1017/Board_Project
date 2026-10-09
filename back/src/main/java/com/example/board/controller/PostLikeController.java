
package com.example.board.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.board.dto.postlike.PostLikeResponse;
import com.example.board.service.PostLikeService;

@RestController
@RequestMapping("/api")
public class PostLikeController {

    private final PostLikeService postLikeService;

    public PostLikeController(PostLikeService postLikeService) {
        this.postLikeService = postLikeService;
    }

    // 좋아요 상태 및 개수 조회
    @GetMapping("/posts/{postId}/likes")
    public ResponseEntity<PostLikeResponse> getLikeStatus(
            @PathVariable Long postId,
            Authentication authentication) {

        PostLikeResponse response = postLikeService.getLikeStatus(
                postId,
                authentication.getName()
        );

        return ResponseEntity.ok(response);
    }

    // 좋아요 등록
    @PostMapping("/posts/{postId}/likes")
    public ResponseEntity<PostLikeResponse> addLike(
            @PathVariable Long postId,
            Authentication authentication) {

        PostLikeResponse response = postLikeService.addLike(
                postId,
                authentication.getName()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 좋아요 취소
    @DeleteMapping("/posts/{postId}/likes")
    public ResponseEntity<PostLikeResponse> removeLike(
            @PathVariable Long postId,
            Authentication authentication) {

        PostLikeResponse response = postLikeService.removeLike(
                postId,
                authentication.getName()
        );

        return ResponseEntity.ok(response);
    }
}