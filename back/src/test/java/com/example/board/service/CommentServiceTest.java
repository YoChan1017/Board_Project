package com.example.board.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.board.dto.comment.CommentListResponse;
import com.example.board.entity.Comment;
import com.example.board.entity.Post;
import com.example.board.entity.User;
import com.example.board.repository.CommentRepository;
import com.example.board.repository.PostRepository;
import com.example.board.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CommentService commentService;

    @Test
    void 삭제된_부모_댓글을_표시하고_대댓글의_부모_연결을_유지한다() {
        Post post = org.mockito.Mockito.mock(Post.class);
        Comment deletedParent = org.mockito.Mockito.mock(Comment.class);
        Comment reply = org.mockito.Mockito.mock(Comment.class);
        User replyAuthor = org.mockito.Mockito.mock(User.class);

        when(postRepository.findByIdAndDeletedAtIsNull(1L))
                .thenReturn(Optional.of(post));
        when(commentRepository.findByPostIdOrderByCreatedAtAscIdAsc(1L))
                .thenReturn(List.of(deletedParent, reply));

        when(deletedParent.getId()).thenReturn(10L);
        when(deletedParent.getParent()).thenReturn(null);
        when(deletedParent.getDeletedAt())
                .thenReturn(LocalDateTime.of(2026, 10, 18, 12, 0));

        when(reply.getId()).thenReturn(11L);
        when(reply.getParent()).thenReturn(deletedParent);
        when(reply.getDeletedAt()).thenReturn(null);
        when(reply.getUser()).thenReturn(replyAuthor);
        when(replyAuthor.getId()).thenReturn(22L);
        when(replyAuthor.getNickname()).thenReturn("답글 작성자");
        when(reply.getContent()).thenReturn("남겨진 대댓글");

        List<CommentListResponse> result = commentService.findByPostId(1L);

        assertEquals(2, result.size());
        assertTrue(result.get(0).isDeleted());
        assertEquals("삭제된 댓글", result.get(0).getAuthorNickname());
        assertEquals("삭제된 댓글입니다.", result.get(0).getContent());
        assertFalse(result.get(1).isDeleted());
        assertEquals(10L, result.get(1).getParentId());
        assertEquals("남겨진 대댓글", result.get(1).getContent());
    }
}
