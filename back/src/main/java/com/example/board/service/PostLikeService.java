
package com.example.board.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.board.dto.postlike.PostLikeResponse;
import com.example.board.entity.Post;
import com.example.board.entity.PostLike;
import com.example.board.entity.User;
import com.example.board.exception.BusinessException;
import com.example.board.exception.ResourceNotFoundException;
import com.example.board.repository.PostLikeRepository;
import com.example.board.repository.PostRepository;
import com.example.board.repository.UserRepository;

@Service
@Transactional(readOnly = true)
public class PostLikeService {

    private final PostLikeRepository postLikeRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public PostLikeService(
            PostLikeRepository postLikeRepository,
            PostRepository postRepository,
            UserRepository userRepository) {
        this.postLikeRepository = postLikeRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    // 좋아요 상태 및 개수 조회
    public PostLikeResponse getLikeStatus(Long postId, String username) {
        findActivePost(postId);
        User user = findUser(username);

        int likeCount = Math.toIntExact(
                postLikeRepository.countByPostId(postId));

        boolean likedByMe = postLikeRepository
                .existsByPostIdAndUserId(postId, user.getId());

        return new PostLikeResponse(postId, likeCount, likedByMe);
    }

    // 좋아요 등록
    @Transactional
    public PostLikeResponse addLike(Long postId, String username) {
        Post post = findActivePost(postId);
        User user = findUser(username);

        boolean alreadyLiked = postLikeRepository
                .existsByPostIdAndUserId(postId, user.getId());

        if (alreadyLiked) {
            throw new BusinessException(
                    "POST_LIKE_ALREADY_EXISTS",
                    "이미 좋아요를 누른 게시글입니다.");
        }

        PostLike postLike = new PostLike();
        postLike.setPost(post);
        postLike.setUser(user);

        postLikeRepository.saveAndFlush(postLike);

        // 실제 좋아요 레코드 개수를 기준으로 동기화
        int likeCount = Math.toIntExact(
                postLikeRepository.countByPostId(postId));

        post.setLikeCount(likeCount);

        return new PostLikeResponse(postId, likeCount, true);
    }

    // 좋아요 취소
    @Transactional
    public PostLikeResponse removeLike(Long postId, String username) {
        Post post = findActivePost(postId);
        User user = findUser(username);

        PostLike postLike = postLikeRepository
                .findByPostIdAndUserId(postId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "좋아요 내역을 찾을 수 없습니다."));

        postLikeRepository.delete(postLike);
        postLikeRepository.flush();

        // 취소 이후 실제 좋아요 개수로 동기화
        int likeCount = Math.toIntExact(
                postLikeRepository.countByPostId(postId));

        post.setLikeCount(likeCount);

        return new PostLikeResponse(postId, likeCount, false);
    }

    // 삭제되지 않은 게시글 조회
    private Post findActivePost(Long postId) {
        return postRepository.findByIdAndDeletedAtIsNull(postId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "게시글을 찾을 수 없습니다."));
    }

    // 사용자 조회
    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "사용자를 찾을 수 없습니다."));
    }
}