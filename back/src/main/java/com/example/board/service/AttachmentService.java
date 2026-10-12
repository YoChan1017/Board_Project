
package com.example.board.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.example.board.dto.attachment.AttachmentResponse;
import com.example.board.entity.Attachment;
import com.example.board.entity.Post;
import com.example.board.repository.AttachmentRepository;
import com.example.board.repository.PostRepository;
import com.example.board.exception.BusinessException;
import com.example.board.exception.ResourceNotFoundException;

@Service
@Transactional(readOnly = true)
public class AttachmentService {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    private final AttachmentRepository attachmentRepository;
    private final PostRepository postRepository;
    private final Path uploadRoot;

    public AttachmentService(
            AttachmentRepository attachmentRepository,
            PostRepository postRepository,
            @Value("${app.upload.dir:${user.home}/board-project-uploads}")
            String uploadDir) {

        this.attachmentRepository = attachmentRepository;
        this.postRepository = postRepository;
        this.uploadRoot = Paths.get(uploadDir)
                .toAbsolutePath()
                .normalize();
    }

    // 게시글의 첨부파일 목록 조회
    public List<AttachmentResponse> findByPostId(Long postId) {
        findActivePost(postId);

        return attachmentRepository
                .findByPostIdOrderByCreatedAtAsc(postId)
                .stream()
                .map(AttachmentResponse::from)
                .toList();
    }

    // 첨부파일 업로드
    @Transactional
    public AttachmentResponse upload(
            Long postId,
            MultipartFile file,
            String username,
            boolean admin) {

        Post post = findActivePost(postId);
        checkPostAccess(post, username, admin);
        
        // 임시 업로드 디버그 출력
        /*
        System.out.println("===== ATTACHMENT UPLOAD DEBUG =====");
        System.out.println("파일명: "
                + (file != null ? file.getOriginalFilename() : "null"));
        System.out.println("파일 크기: "
                + (file != null ? file.getSize() : "null"));
        System.out.println("빈 파일 여부: "
                + (file != null ? file.isEmpty() : "null"));
        System.out.println("Content-Type: "
                + (file != null ? file.getContentType() : "null"));
        System.out.println("===================================");
        */
        
        validateFile(file);

        String originalName = sanitizeOriginalFilename(
                file.getOriginalFilename());

        String storedName = UUID.randomUUID()
                + getSafeExtension(originalName);

        Path targetPath = uploadRoot.resolve(storedName).normalize();

        if (!targetPath.startsWith(uploadRoot)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "잘못된 파일 경로입니다.");
        }

        try {
            Files.createDirectories(uploadRoot);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetPath);
            }

            Attachment attachment = new Attachment();
            attachment.setPost(post);
            attachment.setOriginalName(originalName);
            attachment.setStoredName(storedName);
            attachment.setFilePath(targetPath.toString());
            attachment.setFileSize(file.getSize());
            attachment.setContentType(
                    sanitizeContentType(file.getContentType()));

            Attachment saved = attachmentRepository.saveAndFlush(attachment);

            return AttachmentResponse.from(saved);

        } catch (IOException | RuntimeException e) {
            // DB 저장 실패나 파일 처리 실패 시 남은 파일 정리
            try {
                Files.deleteIfExists(targetPath);
            } catch (IOException cleanupException) {
                e.addSuppressed(cleanupException);
            }

            if (e instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "첨부파일 저장에 실패했습니다.",
                    e);
        }
    }

    // 다운로드에 필요한 파일 및 메타데이터 조회
    public DownloadFile getDownloadFile(Long attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "첨부파일을 찾을 수 없습니다."));

        // 게시글이 Soft Delete된 경우 다운로드 불가
        findActivePost(attachment.getPost().getId());

        Path filePath = resolveStoredPath(attachment);

        if (!Files.isRegularFile(filePath)) {
            throw new ResourceNotFoundException(
                    "실제 첨부파일을 찾을 수 없습니다.");
        }

        try {
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.isReadable()) {
                throw new ResourceNotFoundException(
                        "첨부파일을 읽을 수 없습니다.");
            }

            return new DownloadFile(
                    resource,
                    attachment.getOriginalName());

        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "첨부파일을 읽는 중 오류가 발생했습니다.",
                    e);
        }
    }

    // 첨부파일 삭제
    @Transactional
    public void delete(
            Long attachmentId,
            String username,
            boolean admin) {

        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "첨부파일을 찾을 수 없습니다."));

        Post post = attachment.getPost();
        checkPostAccess(post, username, admin);

        Path filePath = resolveStoredPath(attachment);

        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "첨부파일 삭제에 실패했습니다.",
                    e);
        }

        attachmentRepository.delete(attachment);
    }

    // 삭제되지 않은 게시글 조회
    private Post findActivePost(Long postId) {
        return postRepository.findByIdAndDeletedAtIsNull(postId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "게시글을 찾을 수 없습니다."));
    }

    // 게시글 작성자 또는 관리자만 업로드/삭제 허용
    private void checkPostAccess(
            Post post,
            String username,
            boolean admin) {

        if (admin) {
            return;
        }

        if (post.getUser() == null
                || !post.getUser().getUsername().equals(username)) {

            throw new BusinessException(
                    "ATTACHMENT_ACCESS_DENIED",
                    "게시글 작성자 또는 관리자만 첨부파일을 업로드하거나 삭제할 수 있습니다.");
        }
    }

    // 파일 유효성 검사
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "업로드할 파일을 선택해주세요.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "파일 크기는 10MB를 초과할 수 없습니다.");
        }
    }

    // 원본 파일명에서 경로 요소 제거
    private String sanitizeOriginalFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "파일명이 올바르지 않습니다.");
        }

        String normalized = filename.replace('\\', '/');
        String name = normalized.substring(
                normalized.lastIndexOf('/') + 1);

        if (name.isBlank()
                || name.equals(".")
                || name.equals("..")
                || name.length() > 255) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "파일명이 올바르지 않거나 너무 깁니다.");
        }

        return name;
    }

    // 저장 파일명에는 안전한 확장자만 사용
    private String getSafeExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');

        if (dotIndex <= 0 || dotIndex == filename.length() - 1) {
            return "";
        }

        String extension = filename.substring(dotIndex + 1);

        if (!extension.matches("[a-zA-Z0-9]{1,10}")) {
            return "";
        }

        return "." + extension.toLowerCase();
    }

    // DB 컬럼 길이를 초과하는 MIME 타입은 저장하지 않음
    private String sanitizeContentType(String contentType) {
        if (contentType == null
                || contentType.isBlank()
                || contentType.length() > 100
                || contentType.contains("\r")
                || contentType.contains("\n")) {
            return null;
        }

        return contentType;
    }

    // DB 경로가 업로드 디렉터리 외부를 가리키지 않는지 검증
    private Path resolveStoredPath(Attachment attachment) {
        Path filePath;

        try {
            filePath = Paths.get(attachment.getFilePath())
                    .toAbsolutePath()
                    .normalize();
        } catch (RuntimeException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "저장된 파일 경로가 올바르지 않습니다.",
                    e);
        }

        if (!filePath.startsWith(uploadRoot)) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "허용되지 않은 파일 경로입니다.");
        }

        return filePath;
    }

    // Controller에서 파일 다운로드 응답을 구성할 때 사용하는 객체
    public record DownloadFile(
            Resource resource,
            String originalName) {
    }
}