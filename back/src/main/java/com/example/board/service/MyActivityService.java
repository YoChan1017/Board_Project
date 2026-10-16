package com.example.board.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.board.dto.activity.MyCommentResponse;
import com.example.board.dto.activity.MyPostResponse;
import com.example.board.repository.CommentRepository;
import com.example.board.repository.PostRepository;

@Service
@Transactional(readOnly = true)
public class MyActivityService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    public MyActivityService(PostRepository postRepository, CommentRepository commentRepository) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
    }

    public Page<MyPostResponse> findMyPosts(String username, int page, int size, String keyword) {
        Pageable pageable = createPageable(page, size);
        return postRepository.findMyActivePostsByUsername(username, normalizeKeyword(keyword), pageable)
                .map(MyPostResponse::from);
    }

    public Page<MyCommentResponse> findMyComments(String username, int page, int size, String keyword) {
        Pageable pageable = createPageable(page, size);
        return commentRepository.findMyActiveCommentsByUsername(username, normalizeKeyword(keyword), pageable)
                .map(MyCommentResponse::from);
    }

    private Pageable createPageable(int page, int size) {
        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "페이지 번호는 0 이상이어야 합니다.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "페이지 크기는 1~100 사이여야 합니다.");
        }
        return PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt")
                        .and(Sort.by(Sort.Direction.DESC, "id")));
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) return null;
        String normalized = keyword.trim();
        if (normalized.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "검색어는 200자 이하로 입력해 주세요.");
        }
        return normalized.isEmpty() ? null : normalized;
    }
}
