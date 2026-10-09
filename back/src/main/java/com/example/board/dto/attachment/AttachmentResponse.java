
package com.example.board.dto.attachment;

import java.time.LocalDateTime;

import com.example.board.entity.Attachment;

public class AttachmentResponse {

    private Long id;
    private Long postId;
    private String originalName;
    private Long fileSize;
    private String contentType;
    private LocalDateTime createdAt;
    private String downloadUrl;

    public AttachmentResponse(
            Long id,
            Long postId,
            String originalName,
            Long fileSize,
            String contentType,
            LocalDateTime createdAt,
            String downloadUrl) {

        this.id = id;
        this.postId = postId;
        this.originalName = originalName;
        this.fileSize = fileSize;
        this.contentType = contentType;
        this.createdAt = createdAt;
        this.downloadUrl = downloadUrl;
    }

    public static AttachmentResponse from(Attachment attachment) {
        return new AttachmentResponse(
                attachment.getId(),
                attachment.getPost().getId(),
                attachment.getOriginalName(),
                attachment.getFileSize(),
                attachment.getContentType(),
                attachment.getCreatedAt(),
                "/api/attachments/" + attachment.getId() + "/download"
        );
    }

    public Long getId() {
        return id;
    }

    public Long getPostId() {
        return postId;
    }

    public String getOriginalName() {
        return originalName;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public String getContentType() {
        return contentType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getDownloadUrl() {
        return downloadUrl;
    }
}