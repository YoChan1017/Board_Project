package com.example.board.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.board.entity.Attachment;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

}