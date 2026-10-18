package com.example.board.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.board.dto.comment.CommentCreateRequest;
import com.example.board.dto.comment.CommentListResponse;
import com.example.board.dto.comment.CommentResponse;
import com.example.board.dto.comment.CommentUpdateRequest;
import com.example.board.entity.Comment;
import com.example.board.entity.Post;
import com.example.board.entity.User;
import com.example.board.exception.BusinessException;
import com.example.board.exception.ResourceNotFoundException;
import com.example.board.repository.CommentRepository;
import com.example.board.repository.PostRepository;
import com.example.board.repository.UserRepository;

@Service
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public CommentService(
            CommentRepository commentRepository,
            PostRepository postRepository,
            UserRepository userRepository) {

        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    /**
     * 특정 게시글의 댓글 목록 조회
     */
    public List<CommentListResponse> findByPostId(Long postId) {

        // 삭제되지 않은 게시글인지 확인
        if (!postRepository.findByIdAndDeletedAtIsNull(postId).isPresent()) {
            throw new ResourceNotFoundException(
                    "게시글을 찾을 수 없습니다."
            );
        }

        return commentRepository
                .findByPostIdOrderByCreatedAtAscIdAsc(postId)
                .stream()
                .map(CommentListResponse::from)
                .toList();
    }

    /**
     * 댓글 상세 조회
     */
    public CommentResponse findById(Long commentId) {

        Comment comment = commentRepository
                .findByIdAndDeletedAtIsNull(commentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "댓글을 찾을 수 없습니다."
                        ));

        return CommentResponse.from(comment);
    }

    /**
     * 댓글 / 대댓글 작성
     */
    @Transactional
    public CommentResponse create(
            Long postId,
            CommentCreateRequest request,
            String username) {

        // 게시글 확인
        Post post = postRepository
                .findByIdAndDeletedAtIsNull(postId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "게시글을 찾을 수 없습니다."
                        ));

        // 사용자 확인
        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "사용자를 찾을 수 없습니다."
                        ));

        // 부모 댓글 확인
        Comment parent = findParentComment(
                postId,
                request.getParentId()
        );

        Comment comment = new Comment();

        comment.setPost(post);
        comment.setUser(user);
        comment.setParent(parent);
        comment.setContent(request.getContent());

        Comment savedComment = commentRepository.save(comment);

        return CommentResponse.from(savedComment);
    }

    /**
     * 댓글 수정
     *
     * 작성자 본인 또는 ADMIN만 수정 가능
     */
    @Transactional
    public CommentResponse update(
            Long commentId,
            CommentUpdateRequest request,
            String username,
            boolean admin) {

        Comment comment = commentRepository
                .findByIdAndDeletedAtIsNull(commentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "댓글을 찾을 수 없습니다."
                        ));

        checkAuthorOrAdmin(
                comment,
                username,
                admin
        );

        comment.setContent(request.getContent());

        return CommentResponse.from(comment);
    }

    /**
     * 댓글 삭제
     *
     * 실제 DELETE가 아니라 deletedAt을 기록한다.
     */
    @Transactional
    public void delete(
            Long commentId,
            String username,
            boolean admin) {

        Comment comment = commentRepository
                .findByIdAndDeletedAtIsNull(commentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "댓글을 찾을 수 없습니다."
                        ));

        checkAuthorOrAdmin(
                comment,
                username,
                admin
        );

        comment.setDeletedAt(LocalDateTime.now());
    }

    /**
     * 부모 댓글 조회 및 현재 게시글 소속 여부 검증
     */
    private Comment findParentComment(
            Long postId,
            Long parentId) {

        // 일반 댓글
        if (parentId == null) {
            return null;
        }

        Comment parent = commentRepository
                .findByIdAndDeletedAtIsNull(parentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "부모 댓글을 찾을 수 없습니다."
                        ));

        // 부모 댓글이 현재 게시글의 댓글인지 확인
        if (!parent.getPost().getId().equals(postId)) {
            throw new BusinessException(
                    "INVALID_PARENT_COMMENT",
                    "부모 댓글은 현재 게시글의 댓글이어야 합니다."
            );
        }

        return parent;
    }

    /**
     * 작성자 본인 또는 ADMIN 여부 확인
     */
    private void checkAuthorOrAdmin(
            Comment comment,
            String username,
            boolean admin) {

        if (admin) {
            return;
        }

        if (!comment.getUser().getUsername().equals(username)) {
            throw new BusinessException(
                    "COMMENT_ACCESS_DENIED",
                    "댓글 작성자만 수정하거나 삭제할 수 있습니다."
            );
        }
    }
}
