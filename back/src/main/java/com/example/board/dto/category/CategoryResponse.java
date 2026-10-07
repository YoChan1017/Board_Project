package com.example.board.dto.category;

import com.example.board.entity.Category;

public class CategoryResponse {

    private final Long id;
    private final Long boardId;
    private final String name;

    public CategoryResponse(
            Long id,
            Long boardId,
            String name) {

        this.id = id;
        this.boardId = boardId;
        this.name = name;
    }

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getBoard().getId(),
                category.getName()
        );
    }

    public Long getId() {
        return id;
    }

    public Long getBoardId() {
        return boardId;
    }

    public String getName() {
        return name;
    }
}