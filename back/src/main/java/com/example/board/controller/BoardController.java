package com.example.board.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.board.dto.board.BoardResponse;
import com.example.board.service.BoardService;

@RestController
@RequestMapping("/api/boards")
public class BoardController {

    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    @GetMapping
    public ResponseEntity<List<BoardResponse>> findAll() {

        return ResponseEntity.ok(
                boardService.findAll()
        );
    }

    @GetMapping("/{boardId}")
    public ResponseEntity<BoardResponse> findById(
            @PathVariable Long boardId) {

        return ResponseEntity.ok(
                boardService.findById(boardId)
        );
    }
}