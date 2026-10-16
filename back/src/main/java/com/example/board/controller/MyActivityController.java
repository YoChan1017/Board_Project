package com.example.board.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.board.dto.activity.MyCommentResponse;
import com.example.board.dto.activity.MyPostResponse;
import com.example.board.service.MyActivityService;

@RestController
@RequestMapping("/api/me")
public class MyActivityController {

    private final MyActivityService myActivityService;

    public MyActivityController(MyActivityService myActivityService) {
        this.myActivityService = myActivityService;
    }

    /** Paginated active posts written by the authenticated user. */
    @GetMapping("/posts")
    public ResponseEntity<Page<MyPostResponse>> findMyPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            Authentication authentication) {
        return ResponseEntity.ok(myActivityService.findMyPosts(authentication.getName(), page, size, keyword));
    }

    /** Paginated active comments written by the authenticated user on active posts. */
    @GetMapping("/comments")
    public ResponseEntity<Page<MyCommentResponse>> findMyComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            Authentication authentication) {
        return ResponseEntity.ok(myActivityService.findMyComments(authentication.getName(), page, size, keyword));
    }
}
