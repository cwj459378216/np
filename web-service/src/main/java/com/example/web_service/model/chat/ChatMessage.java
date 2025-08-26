package com.example.web_service.model.chat;

import java.time.LocalDateTime;

public class ChatMessage {
    private String id;
    private String sessionId;
    private String userId;
    private String content;
    private boolean isUser;
    private LocalDateTime timestamp;
    private String aiModel;
    private Integer tokens;
    private Long responseTime;
    private Integer rating;
    private String feedback;

    // Default constructor
    public ChatMessage() {}

    // Builder constructor
    private ChatMessage(Builder builder) {
        this.id = builder.id;
        this.sessionId = builder.sessionId;
        this.userId = builder.userId;
        this.content = builder.content;
        this.isUser = builder.isUser;
        this.timestamp = builder.timestamp;
        this.aiModel = builder.aiModel;
        this.tokens = builder.tokens;
        this.responseTime = builder.responseTime;
        this.rating = builder.rating;
        this.feedback = builder.feedback;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public boolean isUser() { return isUser; }
    public void setUser(boolean user) { isUser = user; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getAiModel() { return aiModel; }
    public void setAiModel(String aiModel) { this.aiModel = aiModel; }

    public Integer getTokens() { return tokens; }
    public void setTokens(Integer tokens) { this.tokens = tokens; }

    public Long getResponseTime() { return responseTime; }
    public void setResponseTime(Long responseTime) { this.responseTime = responseTime; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }

    // Builder class
    public static class Builder {
        private String id;
        private String sessionId;
        private String userId;
        private String content;
        private boolean isUser;
        private LocalDateTime timestamp;
        private String aiModel;
        private Integer tokens;
        private Long responseTime;
        private Integer rating;
        private String feedback;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder sessionId(String sessionId) {
            this.sessionId = sessionId;
            return this;
        }

        public Builder userId(String userId) {
            this.userId = userId;
            return this;
        }

        public Builder content(String content) {
            this.content = content;
            return this;
        }

        public Builder isUser(boolean isUser) {
            this.isUser = isUser;
            return this;
        }

        public Builder timestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public Builder aiModel(String aiModel) {
            this.aiModel = aiModel;
            return this;
        }

        public Builder tokens(Integer tokens) {
            this.tokens = tokens;
            return this;
        }

        public Builder responseTime(Long responseTime) {
            this.responseTime = responseTime;
            return this;
        }

        public Builder rating(Integer rating) {
            this.rating = rating;
            return this;
        }

        public Builder feedback(String feedback) {
            this.feedback = feedback;
            return this;
        }

        public ChatMessage build() {
            return new ChatMessage(this);
        }
    }

    public static Builder builder() {
        return new Builder();
    }
}
