package com.example.board.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.example.board.dto.post.PostCreateRequest;
import com.example.board.dto.post.PostListResponse;
import com.example.board.dto.post.PostResponse;
import com.example.board.dto.post.PostUpdateRequest;
import com.example.board.entity.Board;
import com.example.board.entity.Category;
import com.example.board.entity.Post;
import com.example.board.entity.User;
import com.example.board.exception.BusinessException;
import com.example.board.exception.ResourceNotFoundException;
import com.example.board.repository.BoardRepository;
import com.example.board.repository.CategoryRepository;
import com.example.board.repository.PostRepository;
import com.example.board.repository.UserRepository;

@Service
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final BoardRepository boardRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public PostService(
            PostRepository postRepository,
            BoardRepository boardRepository,
            CategoryRepository categoryRepository,
            UserRepository userRepository) {

        this.postRepository = postRepository;
        this.boardRepository = boardRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    /**
     * 특정 게시판의 게시글 목록 조회
     */
    /**
     * 기존 컨트롤러와의 호환을 위한 첫 페이지 조회
     */
    public List<PostListResponse> findByBoardId(Long boardId) {
        return findByBoardId(boardId, 0, 10, null).getContent();
    }
    
    /**
     * 특정 게시판의 게시글 페이지 조회 및 검색
     */
    public Page<PostListResponse> findByBoardId(
            Long boardId,
            int page,
            int size,
            String keyword) {

        if (!boardRepository.existsById(boardId)) {
            throw new ResourceNotFoundException(
                    "게시판을 찾을 수 없습니다."
            );
        }

        if (page < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "페이지 번호는 0 이상이어야 합니다."
            );
        }

        if (size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "페이지 크기는 1~100 사이여야 합니다."
            );
        }

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
                        .and(Sort.by(Sort.Direction.DESC, "id"))
        );

        String normalizedKeyword =
                keyword == null ? "" : keyword.trim();

        Page<Post> posts;

        if (normalizedKeyword.isEmpty()) {
            posts = postRepository
                    .findByBoardIdAndDeletedAtIsNull(
                            boardId,
                            pageable
                    );
        } else {
            posts = postRepository
                    .searchActivePostsByBoardIdAndKeyword(
                            boardId,
                            normalizedKeyword,
                            pageable
                    );
        }

        return posts.map(PostListResponse::from);
    }

    /**
     * 게시글 상세 조회
     *
     * 조회할 때 조회수를 1 증가시킨다.
     */
    @Transactional
    public PostResponse findById(Long postId) {

        int updatedRows = postRepository.incrementViewCount(postId);
        if (updatedRows == 0) {
            throw new ResourceNotFoundException(
                    "게시글을 찾을 수 없습니다."
            );
        }

        // The modifying query clears the persistence context. Reload the row
        // so the response contains the newly incremented value.
        Post post = postRepository
                .findByIdAndDeletedAtIsNull(postId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "게시글을 찾을 수 없습니다."
                        ));

        return PostResponse.from(post);
    }

    /**
     * 게시글 작성
     */
    @Transactional
    public PostResponse create(
            Long boardId,
            PostCreateRequest request,
            String username) {

        Board board = boardRepository
                .findById(boardId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "게시판을 찾을 수 없습니다."
                        ));

        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "사용자를 찾을 수 없습니다."
                        ));

        Category category = findCategory(
                boardId,
                request.getCategoryId()
        );

        Post post = new Post();

        post.setBoard(board);
        post.setUser(user);
        post.setCategory(category);
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());

        if (post.getViewCount() == null) {
            post.setViewCount(0);
        }

        if (post.getLikeCount() == null) {
            post.setLikeCount(0);
        }

        Post savedPost = postRepository.save(post);

        return PostResponse.from(savedPost);
    }

    /**
     * 게시글 수정
     *
     * 작성자 본인 또는 ADMIN만 수정 가능
     */
    @Transactional
    public PostResponse update(
            Long postId,
            PostUpdateRequest request,
            String username,
            boolean admin) {

        Post post = postRepository
                .findByIdAndDeletedAtIsNull(postId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "게시글을 찾을 수 없습니다."
                        ));

        checkAuthorOrAdmin(post, username, admin);

        Long boardId = post.getBoard().getId();

        Category category = findCategory(
                boardId,
                request.getCategoryId()
        );

        post.setCategory(category);
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());

        return PostResponse.from(post);
    }

    /**
     * 게시글 삭제
     *
     * 실제 DELETE가 아니라 deletedAt을 기록한다.
     */
    @Transactional
    public void delete(
            Long postId,
            String username,
            boolean admin) {

        Post post = postRepository
                .findByIdAndDeletedAtIsNull(postId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "게시글을 찾을 수 없습니다."
                        ));

        checkAuthorOrAdmin(post, username, admin);

        post.setDeletedAt(LocalDateTime.now());
    }

    /**
     * Category 조회 및 Board 소속 여부 검증
     */
    private Category findCategory(
            Long boardId,
            Long categoryId) {

        // 카테고리를 선택하지 않은 경우
        if (categoryId == null) {
            return null;
        }

        Category category = categoryRepository
                .findById(categoryId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "카테고리를 찾을 수 없습니다."
                        ));

        if (!category.getBoard().getId().equals(boardId)) {
            throw new BusinessException(
                    "INVALID_CATEGORY_BOARD",
                    "해당 카테고리는 현재 게시판에 속하지 않습니다."
            );
        }

        return category;
    }

    /**
     * 작성자 본인 또는 ADMIN 여부 확인
     */
    private void checkAuthorOrAdmin(
            Post post,
            String username,
            boolean admin) {

        if (admin) {
            return;
        }

        if (!post.getUser().getUsername().equals(username)) {
            throw new BusinessException(
                    "POST_ACCESS_DENIED",
                    "게시글 작성자만 수정하거나 삭제할 수 있습니다."
            );
        }
    }
}
