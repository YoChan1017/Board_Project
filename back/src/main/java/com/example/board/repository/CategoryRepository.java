package com.example.board.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.board.entity.Category;

public interface CategoryRepository
        extends JpaRepository<Category, Long> {

    // 특정 게시판의 카테고리 목록 조회
    List<Category> findByBoardId(Long boardId);

    // 특정 게시판에 카테고리가 하나라도 존재하는지 확인
    boolean existsByBoardId(Long boardId);

    // 카테고리 생성 시 이름 중복 확인
    boolean existsByBoardIdAndName(
            Long boardId,
            String name
    );

    // 카테고리 수정 시 자기 자신을 제외한 이름 중복 확인
    boolean existsByBoardIdAndNameAndIdNot(
            Long boardId,
            String name,
            Long categoryId
    );
}