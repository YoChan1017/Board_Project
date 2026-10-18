package com.example.board.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.example.board.entity.Post;
import com.example.board.exception.ResourceNotFoundException;
import com.example.board.repository.BoardRepository;
import com.example.board.repository.CategoryRepository;
import com.example.board.repository.PostRepository;
import com.example.board.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    private static final Long BOARD_ID = 1L;

    @Mock
    private PostRepository postRepository;

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PostService postService;

    @Test
    void 존재하지_않는_게시판이면_예외가_발생한다() {
        when(boardRepository.existsById(999L))
                .thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> postService.findByBoardId(999L, 0, 10, null)
        );

        verifyNoInteractions(postRepository);
    }

    @Test
    void 음수_페이지_번호는_400_오류를_발생시킨다() {
        when(boardRepository.existsById(BOARD_ID))
                .thenReturn(true);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> postService.findByBoardId(BOARD_ID, -1, 10, null)
        );

        assertEquals(
                HttpStatus.BAD_REQUEST.value(),
                exception.getStatusCode().value()
        );

        verifyNoInteractions(postRepository);
    }

    @Test
    void 페이지_크기가_허용_범위를_벗어나면_400_오류를_발생시킨다() {
        when(boardRepository.existsById(BOARD_ID))
                .thenReturn(true);

        ResponseStatusException zeroSizeException = assertThrows(
                ResponseStatusException.class,
                () -> postService.findByBoardId(BOARD_ID, 0, 0, null)
        );

        assertEquals(
                HttpStatus.BAD_REQUEST.value(),
                zeroSizeException.getStatusCode().value()
        );

        ResponseStatusException oversizedException = assertThrows(
                ResponseStatusException.class,
                () -> postService.findByBoardId(BOARD_ID, 0, 101, null)
        );

        assertEquals(
                HttpStatus.BAD_REQUEST.value(),
                oversizedException.getStatusCode().value()
        );

        verifyNoInteractions(postRepository);
    }

    @Test
    void 검색어를_공백_제거한_후_페이지와_정렬을_적용한다() {
        when(boardRepository.existsById(BOARD_ID))
                .thenReturn(true);

        when(postRepository.searchActivePostsByBoardIdAndKeyword(
                eq(BOARD_ID),
                anyString(),
                any(Pageable.class)
        )).thenAnswer(invocation ->
                Page.<Post>empty(invocation.getArgument(2))
        );

        Page<?> result = postService.findByBoardId(
                BOARD_ID,
                1,
                2,
                " 스프링 "
        );

        ArgumentCaptor<Pageable> pageableCaptor =
                ArgumentCaptor.forClass(Pageable.class);

        verify(postRepository).searchActivePostsByBoardIdAndKeyword(
                eq(BOARD_ID),
                eq("스프링"),
                pageableCaptor.capture()
        );

        Pageable pageable = pageableCaptor.getValue();

        assertEquals(1, pageable.getPageNumber());
        assertEquals(2, pageable.getPageSize());
        assertEquals(0, result.getNumberOfElements());
        assertEquals(0, result.getTotalElements());

        Sort.Order createdAtOrder =
                pageable.getSort().getOrderFor("createdAt");
        Sort.Order idOrder =
                pageable.getSort().getOrderFor("id");

        assertNotNull(createdAtOrder);
        assertNotNull(idOrder);
        assertEquals(Sort.Direction.DESC, createdAtOrder.getDirection());
        assertEquals(Sort.Direction.DESC, idOrder.getDirection());
    }

    @Test
    void 검색어가_공백뿐이면_일반_게시글_목록을_조회한다() {
        when(boardRepository.existsById(BOARD_ID))
                .thenReturn(true);

        when(postRepository.findByBoardIdAndDeletedAtIsNull(
                eq(BOARD_ID),
                any(Pageable.class)
        )).thenAnswer(invocation ->
                Page.<Post>empty(invocation.getArgument(1))
        );

        postService.findByBoardId(BOARD_ID, 0, 10, "   ");

        verify(postRepository).findByBoardIdAndDeletedAtIsNull(
                eq(BOARD_ID),
                any(Pageable.class)
        );

        verifyNoInteractions(categoryRepository, userRepository);
    }

    @Test
    void 게시글_상세_조회는_원자적으로_조회수를_증가시킨_후_최신값을_반환한다() {
        Post post = org.mockito.Mockito.mock(Post.class);
        com.example.board.entity.Board board =
                org.mockito.Mockito.mock(com.example.board.entity.Board.class);
        com.example.board.entity.User user =
                org.mockito.Mockito.mock(com.example.board.entity.User.class);

        when(postRepository.incrementViewCount(10L)).thenReturn(1);
        when(postRepository.findByIdAndDeletedAtIsNull(10L))
                .thenReturn(java.util.Optional.of(post));
        when(post.getId()).thenReturn(10L);
        when(post.getBoard()).thenReturn(board);
        when(board.getId()).thenReturn(20L);
        when(post.getUser()).thenReturn(user);
        when(user.getId()).thenReturn(30L);
        when(user.getNickname()).thenReturn("작성자");
        when(post.getTitle()).thenReturn("제목");
        when(post.getContent()).thenReturn("내용");
        when(post.getViewCount()).thenReturn(11);
        when(post.getLikeCount()).thenReturn(0);
        when(post.getCreatedAt()).thenReturn(java.time.LocalDateTime.now());
        when(post.getUpdatedAt()).thenReturn(java.time.LocalDateTime.now());

        com.example.board.dto.post.PostResponse response =
                postService.findById(10L);

        assertEquals(11, response.getViewCount());
        verify(postRepository).incrementViewCount(10L);
        verify(postRepository).findByIdAndDeletedAtIsNull(10L);
    }
}
