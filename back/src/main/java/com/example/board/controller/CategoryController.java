package com.example.board.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.board.dto.category.CategoryCreateRequest;
import com.example.board.dto.category.CategoryResponse;
import com.example.board.dto.category.CategoryUpdateRequest;
import com.example.board.service.CategoryService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/boards/{boardId}/categories")
    public ResponseEntity<List<CategoryResponse>> findByBoardId(
            @PathVariable Long boardId) {

        return ResponseEntity.ok(
                categoryService.findByBoardId(boardId)
        );
    }

    @PostMapping("/boards/{boardId}/categories")
    public ResponseEntity<CategoryResponse> create(
            @PathVariable Long boardId,
            @Valid @RequestBody CategoryCreateRequest request) {

        CategoryResponse response =
                categoryService.create(boardId, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/categories/{categoryId}")
    public ResponseEntity<CategoryResponse> findById(
            @PathVariable Long categoryId) {

        return ResponseEntity.ok(
                categoryService.findById(categoryId)
        );
    }

    @PutMapping("/categories/{categoryId}")
    public ResponseEntity<CategoryResponse> update(
            @PathVariable Long categoryId,
            @Valid @RequestBody CategoryUpdateRequest request) {

        return ResponseEntity.ok(
                categoryService.update(categoryId, request)
        );
    }

    @DeleteMapping("/categories/{categoryId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long categoryId) {

        categoryService.delete(categoryId);

        return ResponseEntity.noContent().build();
    }
}