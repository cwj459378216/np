package com.example.web_service.service;

import com.example.web_service.model.chat.ChatMessage;
import com.example.web_service.model.chat.ChatRequest;
import com.example.web_service.model.chat.ChatResponse;
import com.example.web_service.model.chat.ChatSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.List;

public interface ChatService {
    
    /**
     * 处理聊天消息
     */
    ChatResponse processMessage(ChatRequest request);
    
    /**
     * 处理聊天消息(流式)
     */
    ResponseEntity<StreamingResponseBody> processMessageStream(ChatRequest request);
    
    /**
     * 获取聊天历史
     */
    List<ChatMessage> getChatHistory(String sessionId);
    
    /**
     * 获取用户会话列表
     */
    List<ChatSession> getUserSessions(String userId);
    
    /**
     * 创建新会话
     */
    ChatSession createSession(String userId);
    
    /**
     * 删除会话
     */
    void deleteSession(String sessionId);
    
    /**
     * 获取聊天分析数据
     */
    Object getChatAnalytics(String userId);
}
