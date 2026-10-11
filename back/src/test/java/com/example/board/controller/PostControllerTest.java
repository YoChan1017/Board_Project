
package com.example.board.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.board.dto.post.PostListResponse;
import com.example.board.service.PostService;

@ExtendWith(MockitoExtension.class)
class PostControllerTest {

    @Mock
    private PostService postService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new PostController(postService))
                .build();
    }

    @Test
    void 게시글_목록_조회시_기본_페이지_설정을_적용한다()
            throws Exception {

        Page<PostListResponse> pageResult =
                Page.<PostListResponse>empty(
                        PageRequest.of(0, 10)
                );

        when(postService.findByBoardId(1L, 0, 10, null))
                .thenReturn(pageResult);

        mockMvc.perform(
                get("/api/boards/{boardId}/posts", 1L)
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(postService)
                .findByBoardId(1L, 0, 10, null);
    }

    @Test
    void 검색어와_페이지_파라미터를_서비스에_전달한다()
            throws Exception {

        Page<PostListResponse> pageResult =
                Page.<PostListResponse>empty(
                        PageRequest.of(1, 2)
                );

        when(postService.findByBoardId(
                1L, 1, 2, "스프링"
        )).thenReturn(pageResult);

        mockMvc.perform(
                get("/api/boards/{boardId}/posts", 1L)
                        .param("page", "1")
                        .param("size", "2")
                        .param("keyword", "스프링")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(postService)
                .findByBoardId(1L, 1, 2, "스프링");
    }

    @Test
    void 숫자가_아닌_페이지_번호는_400을_반환한다()
            throws Exception {

        mockMvc.perform(
                get("/api/boards/{boardId}/posts", 1L)
                        .param("page", "abc")
        )
                .andExpect(status().isBadRequest());

        verifyNoInteractions(postService);
    }
}
