package com.example.web_service.model.chat;

import java.time.LocalDateTime;

public class ChatResponse {
    private String messageId;
    private String sessionId;
    private String content;
    private String aiModel;
    private LocalDateTime timestamp;
    private Integer tokens;
    private Long responseTime;
    private String error;
    private Boolean success;

    // Default constructor
    public ChatResponse() {}

    // Builder constructor
    private ChatResponse(Builder builder) {
        this.messageId = builder.messageId;
        this.sessionId = builder.sessionId;
        this.content = builder.content;
        this.aiModel = builder.aiModel;
        this.timestamp = builder.timestamp;
        this.tokens = builder.tokens;
        this.responseTime = builder.responseTime;
        this.error = builder.error;
        this.success = builder.success;
    }

    // Getters and Setters
    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getAiModel() { return aiModel; }
    public void setAiModel(String aiModel) { this.aiModel = aiModel; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public Integer getTokens() { return tokens; }
    public void setTokens(Integer tokens) { this.tokens = tokens; }

    public Long getResponseTime() { return responseTime; }
    public void setResponseTime(Long responseTime) { this.responseTime = responseTime; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }

    // Builder class
    public static class Builder {
        private String messageId;
        private String sessionId;
        private String content;
        private String aiModel;
        private LocalDateTime timestamp;
        private Integer tokens;
        private Long responseTime;
        private String error;
        private Boolean success;

        public Builder messageId(String messageId) {
            this.messageId = messageId;
            return this;
        }

        public Builder sessionId(String sessionId) {
            this.sessionId = sessionId;
            return this;
        }

        public Builder content(String content) {
            this.content = content;
            return this;
        }

        public Builder aiModel(String aiModel) {
            this.aiModel = aiModel;
            return this;
        }

        public Builder timestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
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

        public Builder error(String error) {
            this.error = error;
            return this;
        }

        public Builder success(Boolean success) {
            this.success = success;
            return this;
        }

        public ChatResponse build() {
            return new ChatResponse(this);
        }
    }

    public static Builder builder() {
        return new Builder();
    }
}
