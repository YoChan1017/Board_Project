package com.example.board.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.board.dto.category.CategoryCreateRequest;
import com.example.board.dto.category.CategoryResponse;
import com.example.board.dto.category.CategoryUpdateRequest;
import com.example.board.entity.Board;
import com.example.board.entity.Category;
import com.example.board.exception.BusinessException;
import com.example.board.exception.ResourceNotFoundException;
import com.example.board.repository.BoardRepository;
import com.example.board.repository.CategoryRepository;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final BoardRepository boardRepository;

    public CategoryService(
            CategoryRepository categoryRepository,
            BoardRepository boardRepository) {

        this.categoryRepository = categoryRepository;
        this.boardRepository = boardRepository;
    }

    public List<CategoryResponse> findByBoardId(Long boardId) {

        if (!boardRepository.existsById(boardId)) {
            throw new ResourceNotFoundException(
                    "게시판을 찾을 수 없습니다."
            );
        }

        return categoryRepository.findByBoardId(boardId)
                .stream()
                .map(CategoryResponse::from)
                .toList();
    }

    public CategoryResponse findById(Long categoryId) {

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "카테고리를 찾을 수 없습니다."
                        )
                );

        return CategoryResponse.from(category);
    }

    @Transactional
    public CategoryResponse create(
            Long boardId,
            CategoryCreateRequest request) {

        Board board = boardRepository.findById(boardId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "게시판을 찾을 수 없습니다."
                        )
                );

        if (categoryRepository.existsByBoardIdAndName(
                boardId,
                request.getName())) {

            throw new BusinessException(
                    "CATEGORY_NAME_ALREADY_EXISTS",
                    "해당 게시판에 이미 존재하는 카테고리 이름입니다."
            );
        }

        Category category = new Category();

        category.setBoard(board);
        category.setName(request.getName());

        Category savedCategory =
                categoryRepository.save(category);

        return CategoryResponse.from(savedCategory);
    }

    @Transactional
    public CategoryResponse update(
            Long categoryId,
            CategoryUpdateRequest request) {

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "카테고리를 찾을 수 없습니다."
                        )
                );

        Long boardId = category.getBoard().getId();

        if (categoryRepository.existsByBoardIdAndNameAndIdNot(
                boardId,
                request.getName(),
                categoryId)) {

            throw new BusinessException(
                    "CATEGORY_NAME_ALREADY_EXISTS",
                    "해당 게시판에 이미 존재하는 카테고리 이름입니다."
            );
        }

        category.setName(request.getName());

        return CategoryResponse.from(category);
    }

    @Transactional
    public void delete(Long categoryId) {

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "카테고리를 찾을 수 없습니다."
                        )
                );

        categoryRepository.delete(category);
    }
}