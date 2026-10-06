package com.example.board.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

import com.example.board.dto.board.BoardResponse;
import com.example.board.service.BoardService;
import com.example.board.dto.board.BoardCreateRequest;
import com.example.board.dto.board.BoardUpdateRequest;

import jakarta.validation.Valid;

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

    @PostMapping
    public ResponseEntity<BoardResponse> create(
            @Valid @RequestBody BoardCreateRequest request) {

        BoardResponse response =
                boardService.create(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PutMapping("/{boardId}")
    public ResponseEntity<BoardResponse> update(
            @PathVariable Long boardId,
            @Valid @RequestBody BoardUpdateRequest request) {

        BoardResponse response =
                boardService.update(boardId, request);

        return ResponseEntity.ok(response);
    }
}