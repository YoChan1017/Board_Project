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
import com.example.board.dto.board.BoardUpdateRequest;
import com.example.board.repository.CategoryRepository;
import com.example.board.repository.PostRepository;

@Service
@Transactional(readOnly = true)
public class BoardService {

	private final BoardRepository boardRepository;
	private final CategoryRepository categoryRepository;
	private final PostRepository postRepository;

    public BoardService(
            BoardRepository boardRepository,
            CategoryRepository categoryRepository,
            PostRepository postRepository) {

        this.boardRepository = boardRepository;
        this.categoryRepository = categoryRepository;
        this.postRepository = postRepository;
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
    
    @Transactional
    public BoardResponse update(
            Long boardId,
            BoardUpdateRequest request) {

        Board board = boardRepository.findById(boardId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "게시판을 찾을 수 없습니다."
                        )
                );

        if (!board.getName().equals(request.getName())
                && boardRepository.existsByName(request.getName())) {

            throw new BusinessException(
                    "BOARD_NAME_ALREADY_EXISTS",
                    "이미 사용 중인 게시판 이름입니다."
            );
        }

        board.setName(request.getName());
        board.setDescription(request.getDescription());

        return BoardResponse.from(board);
    }
    
    @Transactional
    public void delete(Long boardId) {

        Board board = boardRepository.findById(boardId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "게시판을 찾을 수 없습니다."
                        )
                );

        if (categoryRepository.existsByBoardId(boardId)) {
            throw new BusinessException(
                    "BOARD_HAS_CATEGORIES",
                    "카테고리가 존재하는 게시판은 삭제할 수 없습니다."
            );
        }

        if (postRepository.existsByBoardId(boardId)) {
            throw new BusinessException(
                    "BOARD_HAS_POSTS",
                    "게시글이 존재하는 게시판은 삭제할 수 없습니다."
            );
        }

        boardRepository.delete(board);
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