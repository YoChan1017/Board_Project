package com.example.board.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.board.dto.board.BoardResponse;
import com.example.board.entity.Board;
import com.example.board.exception.ResourceNotFoundException;
import com.example.board.repository.BoardRepository;
import com.example.board.dto.board.BoardCreateRequest;
import com.example.board.exception.BusinessException;

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
    
    @Transactional
    public BoardResponse create(BoardCreateRequest request) {

        if (boardRepository.existsByName(request.getName())) {
            throw new BusinessException(
                    "BOARD_NAME_ALREADY_EXISTS",
                    "이미 사용 중인 게시판 이름입니다."
            );
        }

        Board board = new Board();

        board.setName(request.getName());
        board.setDescription(request.getDescription());

        Board savedBoard = boardRepository.save(board);

        return BoardResponse.from(savedBoard);
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