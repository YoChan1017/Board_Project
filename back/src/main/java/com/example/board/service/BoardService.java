package com.example.board.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.board.dto.board.BoardResponse;
import com.example.board.entity.Board;
import com.example.board.exception.ResourceNotFoundException;
import com.example.board.repository.BoardRepository;

@Service
@Transactional(readOnly = true)
public class BoardService {

    private final BoardRepository boardRepository;

    public BoardService(BoardRepository boardRepository) {
        this.boardRepository = boardRepository;
    }

    public List<BoardResponse> findAll() {

        return boardRepository.findAll()
                .stream()
                .map(BoardResponse::from)
                .toList();
    }

    public BoardResponse findById(Long boardId) {

        Board board = boardRepository.findById(boardId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "게시판을 찾을 수 없습니다."
                        )
                );

        return BoardResponse.from(board);
    }
}