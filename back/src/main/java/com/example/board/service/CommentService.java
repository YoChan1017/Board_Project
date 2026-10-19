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

    /** Lists comments only while their parent post is active. */
    public List<CommentListResponse> findByPostId(Long postId) {

        findActivePost(postId);

        return commentRepository
                .findByPostIdOrderByCreatedAtAscIdAsc(postId)
                .stream()
                .map(CommentListResponse::from)
                .toList();
    }

    /** Finds an active comment only if its parent post is also active. */
    public CommentResponse findById(Long commentId) {

        Comment comment = findActiveComment(commentId);
        ensureParentPostIsActive(comment);

        return CommentResponse.from(comment);
    }

    /** Creates a comment on an active post. */
    @Transactional
    public CommentResponse create(
            Long postId,
            CommentCreateRequest request,
            String username) {

        Post post = findActivePost(postId);

        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "사용자를 찾을 수 없습니다."
                        ));

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

    /** Updates an active comment only while its parent post remains active. */
    @Transactional
    public CommentResponse update(
            Long commentId,
            CommentUpdateRequest request,
            String username,
            boolean admin) {

        Comment comment = findActiveComment(commentId);
        ensureParentPostIsActive(comment);
        checkAuthorOrAdmin(comment, username, admin);

        comment.setContent(request.getContent());

        return CommentResponse.from(comment);
    }

    /** Soft-deletes an active comment only while its parent post remains active. */
    @Transactional
    public void delete(
            Long commentId,
            String username,
            boolean admin) {

        Comment comment = findActiveComment(commentId);
        ensureParentPostIsActive(comment);
        checkAuthorOrAdmin(comment, username, admin);

        comment.setDeletedAt(LocalDateTime.now());
    }

    private Post findActivePost(Long postId) {
        return postRepository.findByIdAndDeletedAtIsNull(postId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "게시글을 찾을 수 없습니다."));
    }

    private Comment findActiveComment(Long commentId) {
        return commentRepository.findByIdAndDeletedAtIsNull(commentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "댓글을 찾을 수 없습니다."));
    }

    /** Prevent access to a comment whose parent post has been soft-deleted. */
    private void ensureParentPostIsActive(Comment comment) {
        Long postId = comment.getPost().getId();
        findActivePost(postId);
    }

    /** Validates that a selected parent comment belongs to the active target post. */
    private Comment findParentComment(
            Long postId,
            Long parentId) {

        if (parentId == null) {
            return null;
        }

        Comment parent = commentRepository
                .findByIdAndDeletedAtIsNull(parentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "부모 댓글을 찾을 수 없습니다."
                        ));

        if (!parent.getPost().getId().equals(postId)) {
            throw new BusinessException(
                    "INVALID_PARENT_COMMENT",
                    "부모 댓글은 현재 게시글의 댓글이어야 합니다."
            );
        }

        // postId was already resolved to an active post in create().
        return parent;
    }

    /** Checks author ownership unless the caller is an administrator. */
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
