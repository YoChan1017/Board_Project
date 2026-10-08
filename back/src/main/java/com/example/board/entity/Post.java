package com.example.board.entity;

import java.time.LocalDateTime;

import org.hibernate.Length;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "posts")
public class Post extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "content", nullable = false, length = Length.LONG32)
    private String content;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /*
    protected Post() {
    }
    */
    
    public Post() {
    	
    }

    public Long getId() {
        return id;
    }

    public Board getBoard() {
        return board;
    }

    public Category getCategory() {
        return category;
    }

    public User getUser() {
        return user;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public Integer getViewCount() {
        return viewCount;
    }

    public Integer getLikeCount() {
        return likeCount;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setBoard(Board board) {
        this.board = board;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setViewCount(Integer viewCount) {
        this.viewCount = viewCount;
    }

    public void setLikeCount(Integer likeCount) {
        this.likeCount = likeCount;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }
}
