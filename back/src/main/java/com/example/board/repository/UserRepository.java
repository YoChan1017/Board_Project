package com.example.board.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.board.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {
}