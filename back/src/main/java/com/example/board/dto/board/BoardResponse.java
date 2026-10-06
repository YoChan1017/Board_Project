package com.example.board.dto.board;

import com.example.board.entity.Board;

public class BoardResponse {

    private final Long id;
    private final String name;
    private final String description;

    public BoardResponse(
            Long id,
            String name,
            String description) {

        this.id = id;
        this.name = name;
        this.description = description;
    }

    public static BoardResponse from(Board board) {
        return new BoardResponse(
                board.getId(),
                board.getName(),
                board.getDescription()
        );
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }
}