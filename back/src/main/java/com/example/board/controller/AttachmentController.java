
package com.example.board.controller;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestPart;

import com.example.board.dto.attachment.AttachmentResponse;
import com.example.board.service.AttachmentService;
import com.example.board.service.AttachmentService.DownloadFile;

@RestController
@RequestMapping("/api")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    // 게시글 첨부파일 목록 조회
    @GetMapping("/posts/{postId}/attachments")
    public ResponseEntity<List<AttachmentResponse>> getAttachments(
            @PathVariable Long postId) {

        return ResponseEntity.ok(
                attachmentService.findByPostId(postId));
    }

    // 첨부파일 업로드
    @PostMapping(
            value = "/posts/{postId}/attachments",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttachmentResponse> upload(
            @PathVariable Long postId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        boolean admin = isAdmin(authentication);

        AttachmentResponse response = attachmentService.upload(
                postId,
                file,
                authentication.getName(),
                admin);

        return ResponseEntity
                .created(java.net.URI.create(response.getDownloadUrl()))
                .body(response);
    }

    // 첨부파일 다운로드
    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<org.springframework.core.io.Resource> download(
            @PathVariable Long attachmentId) {

        DownloadFile file =
                attachmentService.getDownloadFile(attachmentId);

        ContentDisposition disposition = ContentDisposition
                .attachment()
                .filename(file.originalName(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(file.resource());
    }

    // 첨부파일 삭제
    @DeleteMapping("/attachments/{attachmentId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long attachmentId,
            Authentication authentication) {

        attachmentService.delete(
                attachmentId,
                authentication.getName(),
                isAdmin(authentication));

        return ResponseEntity.noContent().build();
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}