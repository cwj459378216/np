package com.example.web_service.model.chat;

import java.time.LocalDateTime;

public class ChatSession {
    private String id;
    private String userId;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime lastActivityAt;
    private Integer messageCount;
    private String status;
    private String aiModel;

    // Default constructor
    public ChatSession() {}

    // Builder constructor
    private ChatSession(Builder builder) {
        this.id = builder.id;
        this.userId = builder.userId;
        this.title = builder.title;
        this.createdAt = builder.createdAt;
        this.lastActivityAt = builder.lastActivityAt;
        this.messageCount = builder.messageCount;
        this.status = builder.status;
        this.aiModel = builder.aiModel;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(LocalDateTime lastActivityAt) { this.lastActivityAt = lastActivityAt; }

    public Integer getMessageCount() { return messageCount; }
    public void setMessageCount(Integer messageCount) { this.messageCount = messageCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAiModel() { return aiModel; }
    public void setAiModel(String aiModel) { this.aiModel = aiModel; }

    // Builder class
    public static class Builder {
        private String id;
        private String userId;
        private String title;
        private LocalDateTime createdAt;
        private LocalDateTime lastActivityAt;
        private Integer messageCount;
        private String status;
        private String aiModel;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder userId(String userId) {
            this.userId = userId;
            return this;
        }

        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder lastActivityAt(LocalDateTime lastActivityAt) {
            this.lastActivityAt = lastActivityAt;
            return this;
        }

        public Builder messageCount(Integer messageCount) {
            this.messageCount = messageCount;
            return this;
        }

        public Builder status(String status) {
            this.status = status;
            return this;
        }

        public Builder aiModel(String aiModel) {
            this.aiModel = aiModel;
            return this;
        }

        public ChatSession build() {
            return new ChatSession(this);
        }
    }

    public static Builder builder() {
        return new Builder();
    }
}
